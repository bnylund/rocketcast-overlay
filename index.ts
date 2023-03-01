/**
 * What do we need?
 *  - Websocket Service (named RocketcastService)
 *  - Websocket ContextProvider / useWebsocket (for React)
 *  - Types for ALL game events
 *  - Event handlers for Rocketcast game events
 *  - Functions to add overlay configuration options / buttons to Rocketcast Control Board
 */

import { io, ManagerOptions, Socket, SocketOptions } from 'socket.io-client'
import { GameEvent } from './game-types'
import EventEmitter from 'events'

declare interface RocketcastService {
  // Socket listeners
  on(event: 'socket:connected', listener: () => void): this
  on(event: 'socket:disconnected', listener: () => void): this

  // Scene listeners
  on(event: 'scene:visibility', listener: (name: string, state: boolean, transition: boolean) => void): this

  // Game listeners
  on(event: 'game:event', listener: (event: GameEvent, data: unknown) => void): this
  on(event: 'game:connected', listener: () => void): this
  on(event: 'game:disconnected', listener: () => void): this

  // Match listeners
  on(event: 'match:update_state', listener: (match: Base.Match) => void): this
}

class RocketcastService extends EventEmitter {
  match: Base.Match = {
    teams: [],
    bestOf: 5,
    hasWinner: false,
    winner: -1,
  }
  server: string

  private gameConnected: boolean = false
  private socket: Socket & { loggedIn?: boolean }

  constructor(private name: string, server: string, opts?: Partial<ManagerOptions & SocketOptions>) {
    super()

    this.server = server
    this.socket = io(server, opts)
    this.registerListeners()
  }

  connect(server: string, opts?: Partial<ManagerOptions & SocketOptions>) {
    this.disconnect()

    this.server = server
    this.socket = io(server, opts)
    this.registerListeners()
  }

  disconnect() {
    if (this.socket.connected) {
      this.emit('socket:disconnected')
      this.socket.disconnect()
    }
  }

  isConnected() {
    return this.socket.connected && this.socket.loggedIn
  }

  isGameConnected() {
    return this.gameConnected
  }

  registerScene(
    name: string,
    props?: { data: SceneData; handler: (data: any) => void; buttons?: { name: string; handler: () => void }[] },
  ) {
    if (this.isConnected()) {
      // Set up handlers
      if (props) {
        this.socket.on('scene:update_data', (sceneName: string, data: any) => {
          if (sceneName === name) {
            props.handler(data)
          }
        })
        this.socket.on('scene:execute', (sceneName: string, name: string) => {
          if (sceneName === name && props.buttons) {
            const button = props.buttons.find((x) => x.name === name)
            if (button) button.handler()
          }
        })
      }

      // Register scene with server
      this.socket.emit(
        'scene:register',
        name,
        props ? props.data : undefined,
        props && props.buttons
          ? props.buttons.map((val, index) => {
              return val.name
            })
          : undefined,
      )
    }
  }

  private registerListeners() {
    // Socket connection listeners
    this.socket.on('connect', () => {
      // Login, then send connected signal
      this.socket.emit('login', 'OVERLAY', this.name)
      this.socket.once('logged_in', () => {
        this.socket.loggedIn = true
        this.emit('socket:connected')
      })
    })
    this.socket.on('disconnect', () => {
      this.socket.loggedIn = false
      this.emit('socket:disconnected')
    })

    // Match listeners
    this.socket.on('match:update_state', (state: Base.Match) => {
      this.match = state
      this.emit('match:update_state', this.match)
    })

    // Scene listeners
    this.socket.on('scene:visibility', (name: string, state: boolean, transition: boolean = false) => {
      this.emit('scene:visibility', name, state, transition)
    })

    // Game socket listeners
    this.socket.on('game:connected', () => {
      this.gameConnected = true
      this.emit('game:connected')
    })
    this.socket.on('game:disconnected', () => {
      this.gameConnected = false
      this.emit('game:disconnected')
    })
  }
}

export default RocketcastService

export type SceneDataType =
  | 'String'
  | 'String[]'
  | 'Number'
  | 'Number[]'
  | 'Boolean'
  | 'Team'
  | 'Team[]'
  | 'Platform'
  | 'Platform[]'
  | 'Player'
  | 'Player[]'
  | 'League'
  | 'League[]'
  | 'Season'
  | 'Season[]'
  | 'Match'
  | 'Match[]'
  | 'Game'
  | 'Game[]'

export interface SceneData {
  [key: string]: SceneDataType | SceneData | SceneData[]
}

export namespace Base {
  export interface Team {
    info: any // Extract team info to its own field, this will be provided by an API
    score: number // Series score.
  }

  export interface Match {
    teams: Base.Team[]
    bestOf: number
    hasWinner: boolean
    winner: number
  }
}
