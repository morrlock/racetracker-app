/** actions */
export const DISCOVER_TRACKER = 'DISCOVER_TRACKER';
export const CONNECT_TRACKER = 'CONNECT_TRACKER';

/** action creators */
export const discoverTracker = (tracker: RaceTracker) => ({
  type: DISCOVER_TRACKER,
  payload: tracker
});

export const connectTracker = (id: string) => ({
  type: CONNECT_TRACKER,
  payload: id
});

const trackers = (state = [], action: Action) => {
  switch (action.type) {
    case DISCOVER_TRACKER:
      return [
        ...state,
        {
          id: action.payload.id,
          rssi: action.payload.rssi,
          name: action.payload.name,
          connected: false
        }
      ];
    default:
      return state;
  }
};

export default trackers;
