import { useEffect, useRef, useCallback } from "react";
import {
  useTVEventHandler,
  HWEvent,
  Platform,
} from "react-native";

export type TVRemoteAction =
  | "select"
  | "playPause"
  | "menu"
  | "longSelect"
  | "up"
  | "down"
  | "left"
  | "right";

type RemoteHandler = (action: TVRemoteAction) => void;

/**
 * Hook that listens for TV remote control events on both
 * Apple TV (Siri Remote) and Android TV (D-pad / remote).
 *
 * Maps platform-specific events to a unified action set.
 */
export function useTVRemote(handler: RemoteHandler) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  const tvEventHandler = useCallback((evt: HWEvent) => {
    const eventType = evt?.eventType;
    if (!eventType) return;

    const mapping: Record<string, TVRemoteAction> = {
      select: "select",
      playPause: "playPause",
      menu: "menu",
      longSelect: "longSelect",
      up: "up",
      down: "down",
      left: "left",
      right: "right",
    };

    const action = mapping[eventType];
    if (action) {
      handlerRef.current(action);
    }
  }, []);

  useTVEventHandler(tvEventHandler);
}
