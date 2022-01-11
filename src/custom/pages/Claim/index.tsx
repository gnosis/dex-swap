import { useEffect, useMemo } from 'react'
import { Trans } from '@lingui/macro'
import { useActiveWeb3React } from 'hooks/web3'
import {
  useUserAvailableParsedClaims,
  useUserUnclaimedAmount,
  useClaimCallback,
  useInvestmentStillAvailable,
  useAirdropStillAvailable,
  ClaimInput,
} from 'state/claim/hooks'
import { ButtonPrimary, ButtonSecondary } from 'components/Button'
import {
  PageWrapper,
  FooterNavButtons,
  InvestFlow,
  InvestContent,
  InvestTokenGroup,
  InvestInput,
  InvestAvailableBar,
  InvestSummary,
  InvestFlowValidation,
  InvestTokenSubtotal,
  StepIndicator,
  Steps,
  TokenLogo,
} from 'pages/Claim/styled'
import EligibleBanner from './EligibleBanner'
import { getFreeClaims, hasPaidClaim, getIndexes, getPaidClaims } from 'state/claim/hooks/utils'
import { useWalletModalToggle } from 'state/application/hooks'
import CowProtocolLogo from 'components/CowProtocolLogo'
import Confetti from 'components/Confetti'
import { isAddress } from 'web3-utils'
import useENS from 'hooks/useENS'
import ClaimNav from './ClaimNav'
import ClaimSummary from './ClaimSummary'
import ClaimAddress from './ClaimAddress'
import CanUserClaimMessage from './CanUserClaimMessage'
import { useClaimDispatchers, useClaimState } from 'state/claim/hooks'
import { ClaimStatus } from 'state/claim/actions'
import ClaimingStatus from './ClaimingStatus'
import ClaimsTable from './ClaimsTable'

export default function Claim() {
  const { account } = useActiveWeb3React()
  // Maintains state, updates Context Provider below
  // useClaimReducer should only be used here, in nested components use "useClaimState"

  const {
    // address/ENS address
    inputAddress,
    // account
    activeClaimAccount,
    // check address
    isSearchUsed,
    // claiming
    claimStatus,
    // investment
    isInvestFlowActive,
    investFlowStep,
    // table select change
    selected,
  } = useClaimState()

  const {
    // account
    setInputAddress,
    setActiveClaimAccount,
    setActiveClaimAccountENS,
    // search
    setIsSearchUsed,
    // claiming
    setClaimStatus,
    // setClaimedAmount, // TODO: uncomment when used
    // investing
    setIsInvestFlowActive,
    setInvestFlowStep,
    // claim row selection
    setSelected,
    setSelectedAll,
  } = useClaimDispatchers()

  const { address: resolvedAddress, name: resolvedENS } = useENS(inputAddress)
  const isInputAddressValid = useMemo(() => isAddress(resolvedAddress || ''), [resolvedAddress])

  // toggle wallet when disconnected
  const toggleWalletModal = useWalletModalToggle()

  // get user claim data
  const userClaimData = useUserAvailableParsedClaims(activeClaimAccount)

  // get total unclaimed ammount
  const unclaimedAmount = useUserUnclaimedAmount(activeClaimAccount)

  const hasClaims = useMemo(() => userClaimData.length > 0, [userClaimData])
  const isAirdropOnly = useMemo(() => !hasPaidClaim(userClaimData), [userClaimData])

  // checks regarding investment time window
  const isInvestmentStillAvailable = useInvestmentStillAvailable()
  const isAirdropStillAvailable = useAirdropStillAvailable()

  // claim callback
  const { claimCallback } = useClaimCallback(activeClaimAccount)

  const handleSelect = (event: React.ChangeEvent<HTMLInputElement>, index: number) => {
    const checked = event.target.checked
    const output = [...selected]
    checked ? output.push(index) : output.splice(output.indexOf(index), 1)
    setSelected(output)

    if (!checked) {
      setSelectedAll(false)
    }
  }

  const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
    const checked = event.target.checked
    const paid = getIndexes(getPaidClaims(userClaimData))
    setSelected(checked ? paid : [])
    setSelectedAll(checked)
  }

  // handle change account
  const handleChangeAccount = () => {
    setActiveClaimAccount('')
    setSelected([])
    setClaimStatus(ClaimStatus.DEFAULT)
    setIsSearchUsed(true)
  }

  // check claim
  const handleCheckClaim = () => {
    setActiveClaimAccount(resolvedAddress || '')
    setActiveClaimAccountENS(resolvedENS || '')
    setInputAddress('')
  }

  // handle submit claim
  const handleSubmitClaim = () => {
    // just to be sure
    if (!activeClaimAccount) return

    const freeClaims = getFreeClaims(userClaimData)

    let inputData = null

    // check if there are any selected (paid) claims
    if (!selected.length) {
      inputData = freeClaims.map(({ index }) => ({ index }))

      console.log('starting claiming with', inputData)
    } else {
      const inputIndices = [...getIndexes(freeClaims), ...selected]
      inputData = inputIndices.reduce<ClaimInput[]>((acc, idx: number) => {
        const claim = userClaimData.find(({ index }) => index === idx)

        if (claim) {
          acc.push({
            amount: claim.amount,
            index: claim.index,
          })
        }

        return acc
      }, [])

      console.log('starting investment flow', inputData)
    }

    setClaimStatus(ClaimStatus.ATTEMPTING)

    if (inputData) {
      claimCallback(inputData)
        // this is not right currently
        .then((/* res */) => {
          // I don't really understand what to expect or do here ¯\_(ツ)_/¯
          setClaimStatus(ClaimStatus.SUBMITTED)
        })
        .catch((error) => {
          setClaimStatus(ClaimStatus.DEFAULT)
          console.log(error)
        })
    }
  }

  console.log(
    `Claim/index::`,
    `[unclaimedAmount ${unclaimedAmount?.toFixed(2)}]`,
    `[hasClaims ${hasClaims}]`,
    `[activeClaimAccount ${activeClaimAccount}]`,
    `[isAirdropOnly ${isAirdropOnly}]`,
    `[isInvestmentStillAvailable ${isInvestmentStillAvailable}]`,
    `[isAirdropStillAvailable ${isAirdropStillAvailable}]`
  )

  // on account change
  useEffect(() => {
    if (!isSearchUsed && account) {
      setActiveClaimAccount(account)
    }

    if (!account) {
      setActiveClaimAccount('')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [account])

  // if wallet is disconnected
  useEffect(() => {
    if (!account && !isSearchUsed) {
      setActiveClaimAccount('')
    }

    if (!account) {
      setIsInvestFlowActive(false)
      setInvestFlowStep(0)
    }
    // setActiveClaimAccount and other dispatch fns are only here for TS. They are safe references.
  }, [account, isSearchUsed, setActiveClaimAccount, setInvestFlowStep, setIsInvestFlowActive])

  return (
    <PageWrapper>
      {/* If claim is confirmed > trigger confetti effect */}
      <Confetti start={claimStatus === ClaimStatus.CONFIRMED} />

      {/* Top nav buttons */}
      <ClaimNav account={account} handleChangeAccount={handleChangeAccount} />
      {/* Show general title OR total to claim (user has airdrop or airdrop+investment) --------------------------- */}
      <EligibleBanner hasClaims={hasClaims} />
      {/* Show total to claim (user has airdrop or airdrop+investment) */}
      <ClaimSummary hasClaims={hasClaims} unclaimedAmount={unclaimedAmount} />
      {/* Get address/ENS (user not connected yet or opted for checking 'another' account) */}
      <ClaimAddress account={account} toggleWalletModal={toggleWalletModal} />
      {/* Is Airdrop only (simple) - does user have claims? Show messages dependent on claim state */}
      <CanUserClaimMessage hasClaims={hasClaims} isAirdropOnly={isAirdropOnly} />
      {/* Try claiming or inform succesfull claim */}
      <ClaimingStatus />
      {/* IS Airdrop + investing (advanced) */}
      <ClaimsTable
        isAirdropOnly={isAirdropOnly}
        userClaimData={userClaimData}
        handleSelect={handleSelect}
        handleSelectAll={handleSelectAll}
        hasClaims={hasClaims}
      />

      {/* START -- Investing vCOW flow (advanced) ----------------------------------------------------- */}
      {!!activeClaimAccount &&
        !!hasClaims &&
        claimStatus === ClaimStatus.DEFAULT &&
        !isAirdropOnly &&
        !!isInvestFlowActive && (
          <InvestFlow>
            <StepIndicator>
              <h1>
                {investFlowStep === 0
                  ? 'Claiming vCOW is a two step process'
                  : investFlowStep === 1
                  ? 'Set allowance to Buy vCOW'
                  : 'Confirm transaction to claim all vCOW'}
              </h1>
              <Steps step={investFlowStep}>
                <li>Allowances: Approve all tokens to be used for investment.</li>
                <li>Submit and confirm the transaction to claim vCOW</li>
              </Steps>
            </StepIndicator>

            {/* Invest flow: Step 1 > Set allowances and investment amounts */}
            {investFlowStep === 1 ? (
              <InvestContent>
                <p>
                  Your account can participate in the investment of vCOW. Each investment opportunity will allow you to
                  invest up to a predefined maximum amount of tokens{' '}
                </p>
                <InvestTokenGroup>
                  <div>
                    <span>
                      <TokenLogo symbol={'GNO'} size={72} />
                      <CowProtocolLogo size={72} />
                    </span>
                    <h3>Buy vCOW with GNO</h3>
                  </div>

                  <span>
                    <InvestSummary>
                      <span>
                        <b>Price</b> <i>16.66 vCoW per GNO</i>
                      </span>
                      <span>
                        <b>Token approval</b>
                        <i>GNO not approved</i>
                        <button>Approve GNO</button>
                      </span>
                      <span>
                        <b>Max. investment available</b> <i>2,500.04 GNO</i>
                      </span>
                      <span>
                        <b>Available investment used</b> <InvestAvailableBar percentage={50} />
                      </span>
                    </InvestSummary>
                    <InvestInput>
                      <div>
                        <span>
                          <b>Balance:</b> <i>10,583.34 GNO</i>
                          {/* Button should use the max possible amount the user can invest, considering their balance + max investment allowed */}
                          <button>Invest max. possible</button>
                        </span>
                        <label>
                          <b>GNO</b>
                          <input placeholder="0" />
                        </label>
                        <i>Receive: 32,432.54 vCOW</i>
                        {/* Insufficient balance validation error */}
                        <small>
                          Insufficient balance to invest. Adjust the amount or go back to remove this investment option.
                        </small>
                      </div>
                    </InvestInput>
                  </span>
                </InvestTokenGroup>

                <InvestTokenGroup>
                  <div>
                    <span>
                      <TokenLogo symbol={'ETH'} size={72} />
                      <CowProtocolLogo size={72} />
                    </span>
                    <h3>Buy vCOW with ETH</h3>
                  </div>

                  <span>
                    <InvestSummary>
                      <span>
                        <b>Price</b> <i>16.66 vCoW per ETH</i>
                      </span>
                      <span>
                        <b>Token approval</b>
                        <i>Not needed for ETH!</i>
                      </span>
                      <span>
                        <b>Max. investment available</b> <i>2,500.04 ETH</i>
                      </span>
                      <span>
                        <b>Available investment used</b> <InvestAvailableBar percentage={50} />
                      </span>
                    </InvestSummary>
                    <InvestInput>
                      <div>
                        <span>
                          <b>Balance:</b> <i>10,583.34 ETH</i>
                          {/* Button should use the max possible amount the user can invest, considering their balance + max investment allowed */}
                          <button>Invest max. possible</button>
                        </span>
                        <label>
                          <b>ETH</b>
                          <input placeholder="0" />
                        </label>
                        <i>Receive: 32,432.54 vCOW</i>
                        {/* Insufficient balance validation error */}
                        <small>
                          Insufficient balance to invest. Adjust the amount or go back to remove this investment option.
                        </small>
                      </div>
                    </InvestInput>
                  </span>
                </InvestTokenGroup>

                <InvestTokenSubtotal>
                  {activeClaimAccount} will receive: 4,054,671.28 vCOW based on investment(s)
                </InvestTokenSubtotal>

                <InvestFlowValidation>Approve all investment tokens before continuing</InvestFlowValidation>
              </InvestContent>
            ) : null}

            {/* Invest flow: Step 2 > Review summary */}
            {investFlowStep === 2 ? (
              <InvestContent>
                1. Claim airdrop: {activeClaimAccount} receives 13,120.50 vCOW (Note: please make sure you intend to
                claim and send vCOW to the mentioned account)
                <br />
                <br />
                2. Claim and invest: Investing with account: {account} (connected account). Investing: 1343 GNO (50% of
                available investing opportunity) and 32 ETH (30% of available investing opportunity)
                <br />
                <br />
                3. Receive vCOW claims on account {activeClaimAccount}: 23,947.6 vCOW - available NOW! and 120,567.12
                vCOW - Vested linearly 4 years <br />
                <br />
                <br />
                <h4>Ready to claim your vCOW?</h4>
                <p>
                  <b>What will happen?</b> By sending this Ethereum transaction, you will be investing tokens from the
                  connected account and exchanging them for vCOW tokens that will be received by the claiming account
                  specified above.
                </p>
                <p>
                  <b>Can I modify the invested amounts or invest partial amounts later?</b> No. Once you send the
                  transaction, you cannot increase or reduce the investment. Investment oportunities can only be
                  exercised once.
                </p>
              </InvestContent>
            ) : null}
          </InvestFlow>
        )}
      {/* END -- Investing vCOW flow (advanced) ----------------------------------------------------- */}

      <FooterNavButtons>
        {/* General claim vCOW button  (no invest) */}
        {!!activeClaimAccount && !!hasClaims && !isInvestFlowActive && claimStatus === ClaimStatus.DEFAULT ? (
          account ? (
            <ButtonPrimary onClick={handleSubmitClaim}>
              <Trans>Claim vCOW</Trans>
            </ButtonPrimary>
          ) : (
            <ButtonPrimary onClick={toggleWalletModal}>
              <Trans>Connect a wallet</Trans>
            </ButtonPrimary>
          )
        ) : null}

        {/* Check for claims button */}
        {(!activeClaimAccount || !hasClaims) && (
          <ButtonPrimary disabled={!isInputAddressValid} type="text" onClick={handleCheckClaim}>
            <Trans>Check claimable vCOW</Trans>
          </ButtonPrimary>
        )}

        {/* Invest flow button */}
        {!!activeClaimAccount &&
          !!hasClaims &&
          claimStatus === ClaimStatus.DEFAULT &&
          !isAirdropOnly &&
          !!isInvestFlowActive && (
            <>
              {investFlowStep === 0 ? (
                <ButtonPrimary onClick={() => setInvestFlowStep(1)}>
                  <Trans>Approve tokens</Trans>
                </ButtonPrimary>
              ) : investFlowStep === 1 ? (
                <ButtonPrimary onClick={() => setInvestFlowStep(2)}>
                  <Trans>Review</Trans>
                </ButtonPrimary>
              ) : (
                <ButtonPrimary onClick={() => setInvestFlowStep(3)}>
                  <Trans>Claim and invest vCOW</Trans>
                </ButtonPrimary>
              )}

              <ButtonSecondary
                onClick={() =>
                  investFlowStep === 0 ? setIsInvestFlowActive(false) : setInvestFlowStep(investFlowStep - 1)
                }
              >
                <Trans>Go back</Trans>
              </ButtonSecondary>
            </>
          )}
      </FooterNavButtons>
    </PageWrapper>
  )
}
