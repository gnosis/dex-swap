import React from 'react'
import styled from 'styled-components'
import { ButtonProps } from 'rebass/styled-components'
import { ChevronDown } from 'react-feather'

import { RowBetween } from 'components/Row'

import {
  // Import only the basic buttons
  ButtonPrimary as ButtonPrimaryMod,
  ButtonLight as ButtonLightMod,
  ButtonGray as ButtonGrayMod,
  ButtonSecondary as ButtonSecondaryMod,
  ButtonPink as ButtonPinkMod,
  ButtonOutlined as ButtonOutlinedMod,
  ButtonEmpty as ButtonEmptyMod,
  ButtonWhite as ButtonWhiteMod,
  ButtonConfirmedStyle as ButtonConfirmedStyleMod,
  ButtonErrorStyle as ButtonErrorStyleMod
  // We don't import the "composite" buttons, they are just redefined (c&p actually)
} from './ButtonMod'

export const ButtonPrimary = styled(ButtonPrimaryMod)`
  // CSS overrides
  ${({ theme }) => (theme.buttonPrimary?.background ? theme.buttonPrimary?.background : theme.bgLinearGradient)}
  font-size: ${({ theme }) => (theme.buttonLight?.fontSize ? theme.buttonLight.fontSize : '16px')};
  font-weight: ${({ theme }) => (theme.buttonLight?.fontWeight ? theme.buttonLight.fontWeight : 500)};
  border: ${({ theme }) => (theme.buttonLight?.border ? theme.buttonLight.border : 0)};
  box-shadow: ${({ theme }) => (theme.buttonLight?.boxShadow ? theme.buttonLight.boxShadow : 'none')};
  border-radius: ${({ theme }) => (theme.buttonLight?.borderRadius ? theme.buttonLight.borderRadius : 0)};

  &:focus,
  &:hover,
  &:active {
    ${({ theme }) => (theme.buttonPrimary?.background ? theme.buttonPrimary?.background : theme.bgLinearGradient)}
    border: ${({ theme }) => (theme.buttonLight?.border ? theme.buttonLight.border : 0)};
  }
  &:disabled {
    background-color: ${({ theme }) => theme.disabled};
    background-image: none;
    border: 0;
  }
`

export const ButtonLight = styled(ButtonLightMod)`
  // CSS override
  background-color: ${({ theme }) => theme.primary5};
  color: ${({ theme }) => theme.primaryText1};
  font-size: ${({ theme }) => (theme.buttonLight?.fontSize ? theme.buttonLight.fontSize : '16px')};
  font-weight: ${({ theme }) => (theme.buttonLight?.fontWeight ? theme.buttonLight.fontWeight : 500)};
  border: ${({ theme }) => (theme.buttonLight?.border ? theme.buttonLight.border : 0)};
  box-shadow: ${({ theme }) => (theme.buttonLight?.boxShadow ? theme.buttonLight.boxShadow : 'none')};
  border-radius: ${({ theme }) => (theme.buttonLight?.borderRadius ? theme.buttonLight.borderRadius : 0)};
  ${({ theme }) => theme.cursor};

  &:focus {
    box-shadow: ${({ theme }) => (theme.buttonLight?.boxShadow ? theme.buttonLight.boxShadow : 'none')};
    background-color: inherit;
  }
  &:hover {
    background-color: inherit;
  }
  &:active {
    box-shadow: ${({ theme }) => (theme.buttonLight?.boxShadow ? theme.buttonLight.boxShadow : 'none')};
    background-color: inherit;
  }
  :disabled {
    opacity: 0.4;
    :hover {
      cursor: auto;
      background-color: ${({ theme }) => theme.primary5};
      box-shadow: none;
      border: ${({ theme }) =>
        theme.buttonLight?.borderHover ? theme.buttonLight.borderHover : '1px solid transparent'};
      outline: none;
    }
  }
`

export const ButtonGray = styled(ButtonGrayMod)`
  // CSS overrides
`

export const ButtonSecondary = styled(ButtonSecondaryMod)`
  // CSS overrides
`

export const ButtonPink = styled(ButtonPinkMod)`
  // CSS overrides
`

export const ButtonOutlined = styled(ButtonOutlinedMod)`
  // CSS overrides
`

export const ButtonWhite = styled(ButtonWhiteMod)`
  // CSS overrides
`

export const ButtonConfirmedStyle = styled(ButtonConfirmedStyleMod)`
  // CSS overrides
`

export const ButtonErrorStyle = styled(ButtonErrorStyleMod)`
  // CSS overrides
`

export const ButtonEmpty = styled(ButtonEmptyMod)`
  // CSS overrides
`

export function ButtonConfirmed({
  confirmed,
  altDisabledStyle,
  ...rest
}: { confirmed?: boolean; altDisabledStyle?: boolean } & ButtonProps) {
  if (confirmed) {
    return <ButtonConfirmedStyle {...rest} />
  } else {
    return <ButtonPrimary {...rest} altDisabledStyle={altDisabledStyle} />
  }
}

export function ButtonError({ error, ...rest }: { error?: boolean } & ButtonProps) {
  if (error) {
    return <ButtonErrorStyle {...rest} />
  } else {
    return <ButtonPrimary {...rest} />
  }
}

export function ButtonDropdown({ disabled = false, children, ...rest }: { disabled?: boolean } & ButtonProps) {
  return (
    <ButtonPrimary {...rest} disabled={disabled}>
      <RowBetween>
        <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
        <ChevronDown size={24} />
      </RowBetween>
    </ButtonPrimary>
  )
}

export function ButtonDropdownLight({ disabled = false, children, ...rest }: { disabled?: boolean } & ButtonProps) {
  return (
    <ButtonOutlined {...rest} disabled={disabled}>
      <RowBetween>
        <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
        <ChevronDown size={24} />
      </RowBetween>
    </ButtonOutlined>
  )
}

export function ButtonRadio({ active, ...rest }: { active?: boolean } & ButtonProps) {
  if (!active) {
    return <ButtonWhite {...rest} />
  } else {
    return <ButtonPrimary {...rest} />
  }
}
