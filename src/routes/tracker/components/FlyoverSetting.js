import React, { Component } from 'react';

import { ListItem, Toggle } from 'material-ui';

export default class FlyoverSetting extends Component {
  props: {
    id: string,
    raceMode: string,
    setRaceMode: Function
  };

  handleOnToggle = (event: Object, isInputChecked: bool) => {
    if (isInputChecked) {
      this.props.setRaceMode({ device_id: this.props.id, raceMode: 'flyby'});
    } else {
      this.props.setRaceMode({ device_id: this.props.id, raceMode: 'shotgun'});
    }
  }

  render() {
    let toggle = (this.props.raceMode === 'flyby') ? true : false;
    let text = <h3 className="no-margin">Detect VTx to start timing</h3>;
    let toggleSwitch = <Toggle defaultToggled={toggle} onToggle={this.handleOnToggle} label={text} />;
    let secondary = 'Timing begins when the video transmitter flies over the RaceTracker';
    return <ListItem disabled primaryText={toggleSwitch} secondaryText={secondary} />;
  }
}
