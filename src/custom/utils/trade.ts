import { ChainId, CurrencyAmount, Token } from '@uniswap/sdk'
import { isAddress, shortenAddress } from '@src/utils'
import { AddPendingOrderParams, OrderStatus, OrderKind } from 'state/orders/actions'

import { signOrder, UnsignedOrder } from 'utils/signatures'
import { postSignedOrder } from 'utils/operator'
import { BigNumberish, Signer } from 'ethers'
import { APP_ID, RADIX_DECIMAL, SHORTEST_PRECISION } from 'constants/index'

export interface PostOrderParams {
  account: string
  chainId: ChainId
  signer: Signer
  kind: OrderKind
  inputAmount: CurrencyAmount
  outputAmount: CurrencyAmount
  feeAmount: BigNumberish
  sellToken: Token
  buyToken: Token
  validTo: number
  recipient: string
  recipientAddressOrName: string | null
  addPendingOrder: (order: AddPendingOrderParams) => void
}

function _getSummary(params: PostOrderParams): string {
  const { inputAmount, outputAmount, account, recipient, recipientAddressOrName } = params

  const inputSymbol = inputAmount.currency.symbol
  const outputSymbol = outputAmount.currency.symbol
  const inputAmountValue = inputAmount.toSignificant(SHORTEST_PRECISION)
  const outputAmountValue = outputAmount.toSignificant(SHORTEST_PRECISION)

  const base = `Swap ${inputAmountValue} ${inputSymbol} for ${outputAmountValue} ${outputSymbol}`

  if (recipient === account) {
    return base
  } else {
    const toAddress =
      recipientAddressOrName && isAddress(recipientAddressOrName)
        ? shortenAddress(recipientAddressOrName)
        : recipientAddressOrName

    return `${base} to ${toAddress}`
  }
}

export async function postOrder(params: PostOrderParams): Promise<string> {
  const {
    kind,
    addPendingOrder,
    chainId,
    inputAmount,
    outputAmount,
    sellToken,
    buyToken,
    feeAmount,
    validTo,
    account,
    signer
  } = params

  const sellAmount = inputAmount.raw.toString(RADIX_DECIMAL)
  const buyAmount = outputAmount.raw.toString(RADIX_DECIMAL)

  // Prepare order
  const summary = _getSummary(params)
  const unsignedOrder: UnsignedOrder = {
    sellToken: sellToken.address,
    buyToken: buyToken.address,
    sellAmount,
    buyAmount,
    validTo,
    appData: APP_ID,
    feeAmount,
    kind,
    partiallyFillable: false // Always fill or kill
  }

  const signature = await signOrder({
    chainId,
    signer,
    order: unsignedOrder
  })
  const creationTime = new Date().toISOString()

  // Call API
  const orderId = await postSignedOrder({
    chainId,
    order: {
      ...unsignedOrder,
      signature
    }
  })

  // Update the state
  addPendingOrder({
    chainId,
    id: orderId,
    order: {
      ...unsignedOrder,
      id: orderId,
      owner: account,
      creationTime,
      signature,
      status: OrderStatus.PENDING,
      summary
    }
  })

  return orderId
}
