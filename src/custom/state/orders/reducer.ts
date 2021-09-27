import { createReducer, PayloadAction } from '@reduxjs/toolkit'
import { OrderID } from 'api/gnosisProtocol'
import { SupportedChainId as ChainId } from 'constants/chains'
import {
  addPendingOrder,
  removeOrder,
  clearOrders,
  fulfillOrder,
  OrderStatus,
  updateLastCheckedBlock,
  expireOrder,
  fulfillOrdersBatch,
  expireOrdersBatch,
  cancelOrder,
  cancelOrdersBatch,
  requestOrderCancellation,
  SerializedOrder,
  setIsOrderUnfillable,
  addOrUpdateOrdersBatch,
} from './actions'
import { ContractDeploymentBlocks } from './consts'
import { Writable } from 'types'

// previous order state, to use in checks
// in case users have older, stale state and we need to handle
export interface V2OrderObject {
  id: OrderObject['id']
  order: Omit<OrderObject['order'], 'inputToken' | 'outputToken'>
}

export interface OrderObject {
  id: OrderID
  order: SerializedOrder
}

// {order uuid => OrderObject} mapping
type OrdersMap = Record<OrderID, OrderObject>
export type PartialOrdersMap = Partial<OrdersMap>

export type OrdersState = {
  readonly [chainId in ChainId]?: {
    pending: PartialOrdersMap
    fulfilled: PartialOrdersMap
    expired: PartialOrdersMap
    cancelled: PartialOrdersMap
    lastCheckedBlock: number
  }
}

export interface PrefillStateRequired {
  chainId: ChainId
}

// makes sure there's always an object at state[chainId], state[chainId].pending | .fulfilled
function prefillState(
  state: Writable<OrdersState>,
  { payload: { chainId } }: PayloadAction<PrefillStateRequired>
): asserts state is Required<OrdersState> {
  // asserts that state[chainId].pending | .fulfilled | .expired is ok to access
  const stateAtChainId = state[chainId]

  if (!stateAtChainId) {
    state[chainId] = {
      pending: {},
      fulfilled: {},
      expired: {},
      cancelled: {},
      lastCheckedBlock: ContractDeploymentBlocks[chainId] ?? 0,
    }
    return
  }

  if (!stateAtChainId.pending) {
    stateAtChainId.pending = {}
  }

  if (!stateAtChainId.fulfilled) {
    stateAtChainId.fulfilled = {}
  }

  if (!stateAtChainId.expired) {
    stateAtChainId.expired = {}
  }

  if (!stateAtChainId.cancelled) {
    stateAtChainId.cancelled = {}
  }

  if (stateAtChainId.lastCheckedBlock === undefined) {
    stateAtChainId.lastCheckedBlock = ContractDeploymentBlocks[chainId] ?? 0
  }
}

const initialState: OrdersState = {}

export default createReducer(initialState, (builder) =>
  builder
    .addCase(addPendingOrder, (state, action) => {
      prefillState(state, action)
      const { order, id, chainId } = action.payload

      state[chainId].pending[id] = { order, id }
    })
    .addCase(removeOrder, (state, action) => {
      prefillState(state, action)
      const { id, chainId } = action.payload
      delete state[chainId].pending[id]
      delete state[chainId].fulfilled[id]
      delete state[chainId].expired[id]
      delete state[chainId].cancelled[id]
    })
    .addCase(addOrUpdateOrdersBatch, (state, action) => {
      prefillState(state, action)
      const { chainId, orders } = action.payload
      const pending = state[chainId].pending
      const fulfilled = state[chainId].fulfilled
      const expired = state[chainId].expired
      const cancelled = state[chainId].cancelled

      orders.forEach((newOrder) => {
        const { id } = newOrder

        // does the order exist already in the state?
        // if so, get it, and remove from state
        let orderObj
        if (pending[id]) {
          orderObj = pending[id]
          delete pending[id]
        } else if (fulfilled[id]) {
          orderObj = fulfilled[id]
          delete fulfilled[id]
        } else if (expired[id]) {
          orderObj = expired[id]
          delete expired[id]
        } else if (cancelled[id]) {
          orderObj = cancelled[id]
          delete cancelled[id]
        }

        const status = newOrder.status

        const order = orderObj ? { ...orderObj.order, apiAdditionalInfo: newOrder.apiAdditionalInfo, status } : newOrder

        // what's the status now?
        // add order to respective state
        switch (status) {
          case 'pending':
            pending[id] = { order, id }
            break
          case 'cancelled':
            cancelled[id] = { order, id }
            break
          case 'expired':
            expired[id] = { order, id }
            break
          case 'fulfilled':
            fulfilled[id] = { order, id }
            break
          default:
            // TODO: add it regardless?
            console.warn(`Unknown state '${state}' for order`, id, newOrder)
        }
      })
    })
    .addCase(fulfillOrder, (state, action) => {
      prefillState(state, action)
      const { id, chainId, fulfillmentTime, transactionHash } = action.payload

      const orderObject = state[chainId].pending[id]

      if (orderObject) {
        delete state[chainId].pending[id]

        orderObject.order.status = OrderStatus.FULFILLED
        orderObject.order.fulfillmentTime = fulfillmentTime

        orderObject.order.fulfilledTransactionHash = transactionHash
        orderObject.order.isCancelling = false

        state[chainId].fulfilled[id] = orderObject
      }
    })
    .addCase(fulfillOrdersBatch, (state, action) => {
      prefillState(state, action)
      const { ordersData, chainId } = action.payload

      const pendingOrders = state[chainId].pending
      const cancelledOrders = state[chainId].cancelled
      const fulfilledOrders = state[chainId].fulfilled

      // if there are any newly fulfilled orders
      // update them
      ordersData.forEach(({ id, fulfillmentTime, transactionHash, apiAdditionalInfo }) => {
        const orderObject = pendingOrders[id] || cancelledOrders[id]

        if (orderObject) {
          delete pendingOrders[id]
          delete cancelledOrders[id]

          orderObject.order.status = OrderStatus.FULFILLED
          orderObject.order.fulfillmentTime = fulfillmentTime

          orderObject.order.fulfilledTransactionHash = transactionHash
          orderObject.order.isCancelling = false

          orderObject.order.apiAdditionalInfo = apiAdditionalInfo

          fulfilledOrders[id] = orderObject
        }
      })
    })
    .addCase(expireOrder, (state, action) => {
      prefillState(state, action)
      const { id, chainId } = action.payload

      const orderObject = state[chainId].pending[id]

      if (orderObject) {
        delete state[chainId].pending[id]

        orderObject.order.status = OrderStatus.EXPIRED
        orderObject.order.isCancelling = false

        state[chainId].expired[id] = orderObject
      }
    })
    .addCase(expireOrdersBatch, (state, action) => {
      prefillState(state, action)
      const { ids, chainId } = action.payload

      const pendingOrders = state[chainId].pending
      const fulfilledOrders = state[chainId].expired

      // if there are any newly fulfilled orders
      // update them
      ids.forEach((id) => {
        const orderObject = pendingOrders[id]

        if (orderObject) {
          delete pendingOrders[id]

          orderObject.order.status = OrderStatus.EXPIRED
          orderObject.order.isCancelling = false
          fulfilledOrders[id] = orderObject
        }
      })
    })
    .addCase(requestOrderCancellation, (state, action) => {
      prefillState(state, action)
      const { id, chainId } = action.payload

      const orderObject = state[chainId].pending[id]

      if (orderObject) {
        orderObject.order.isCancelling = true
      }
    })
    .addCase(cancelOrder, (state, action) => {
      prefillState(state, action)
      const { id, chainId } = action.payload

      const orderObject = state[chainId].pending[id]

      if (orderObject) {
        delete state[chainId].pending[id]

        orderObject.order.status = OrderStatus.CANCELLED
        orderObject.order.isCancelling = false

        state[chainId].cancelled[id] = orderObject
      }
    })
    .addCase(cancelOrdersBatch, (state, action) => {
      prefillState(state, action)
      const { ids, chainId } = action.payload

      const pendingOrders = state[chainId].pending
      const cancelledOrders = state[chainId].cancelled

      ids.forEach((id) => {
        const orderObject = pendingOrders[id]

        if (orderObject) {
          delete pendingOrders[id]

          orderObject.order.status = OrderStatus.CANCELLED
          orderObject.order.isCancelling = false
          cancelledOrders[id] = orderObject
        }
      })
    })
    .addCase(clearOrders, (state, action) => {
      const { chainId } = action.payload

      const lastCheckedBlock = state[chainId]?.lastCheckedBlock

      state[chainId] = {
        pending: {},
        fulfilled: {},
        expired: {},
        cancelled: {},
        lastCheckedBlock: lastCheckedBlock ?? ContractDeploymentBlocks[chainId] ?? 0,
      }
    })
    .addCase(updateLastCheckedBlock, (state, action) => {
      prefillState(state, action)
      const { chainId, lastCheckedBlock } = action.payload

      state[chainId].lastCheckedBlock = lastCheckedBlock
    })
    .addCase(setIsOrderUnfillable, (state, action) => {
      prefillState(state, action)
      const { chainId, id, isUnfillable } = action.payload

      const orderObject = state[chainId].pending[id]

      if (orderObject?.order) {
        orderObject.order.isUnfillable = isUnfillable
      }
    })
)
