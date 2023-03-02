/**
 * Providers:
 *  - SolidJS
 *  - React
 *
 */
import React from 'react'
import { createContext as createContextSolid, useContext as useContextSolid } from 'solid-js'
import { ManagerOptions, SocketOptions } from 'socket.io-client'
import RocketcastService from '.'

// #region SolidJS

export const RocketcastContextSolid = createContextSolid<RocketcastService | null>(null)
export const useRocketcastSolid = () => {
  return useContextSolid(RocketcastContextSolid)
}

export const SolidJS = (name: string, server: string, opts?: Partial<ManagerOptions & SocketOptions>) => {
  const SERVICE = new RocketcastService(name, server, opts)

  return {
    SERVICE,
    Provider: (props: any): JSX.Element => {
      return (
        <>
          {RocketcastContextSolid.Provider({
            value: SERVICE,
            ...props,
          })}
        </>
      )
    },
  }
}

// #endregion
