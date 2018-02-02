// @flow
import React, { Component } from 'react';
import { List, ListItem } from 'material-ui';

import Heat from '../containers/HeatContainer';
import Stopwatch from '../containers/StopwatchContainer';
import RacetrackerCard from '../containers/RacetrackerCardContainer';

export default class Racing extends Component {
  props: {
    isRaceActive: boolean,
    isRaceValid: boolean,
    activeHeatId: string,
    connectedTrackers: Array<RaceTracker>,
    validateRace: Function,
    createRace: Function
  };

  componentDidMount() {
    // no previous race exists, create a new one using the connected tracker
    if (!this.props.isRaceActive && !this.props.isRaceValid && this.props.connectedTrackers.length === 1) {
      // console.log("CREATE-DID_MOUNT")
      this.props.createRace(this.props.connectedTrackers[0]);
    }
    // a previous race was setup, validate it or reset as needed
    if (this.props.isRaceActive && !this.props.isRaceValid) {
      // TODO: console.log("VALIDATE-DID_MOUNT")
      // this.props.validateRace(this.props.activeRace);
    }
  }

  componentWillReceiveProps(nextProps) {
    // no previous race exists, create a new one using the connected tracker
    if (!nextProps.isRaceActive && !nextProps.isRaceValid && nextProps.connectedTrackers.length === 1) {
      this.props.createRace(nextProps.connectedTrackers[0]);
    }
    // a previous race was running, validate and proceed
    if (nextProps.isRaceActive && !nextProps.isRaceValid) {
      // TODO: console.log("VALIDATE-WILL_RECEIVE")
      // this.props.validateRace(this.props.activeRace);
    }
  }

  heatInterface = () => {
    return <Stopwatch />;
  };

  heatList = () => {
    let { activeHeatId } = this.props;
    return (
      <List className="heat-list">
        <ListItem key={activeHeatId} className="small-screen" disabled primaryText={<Heat id={activeHeatId} />} />
      </List>
    );
  };

  handleListClick = (event: RaceTracker) => {
    this.props.createRace(event);
  };

  render() {
    let { isRaceValid, isRaceActive, connectedTrackers } = this.props;
    return (
      <div>
        {isRaceValid && isRaceActive && <this.heatInterface />}
        {isRaceValid && isRaceActive && <this.heatList />}
        {!isRaceValid && !isRaceActive && connectedTrackers.length > 1
          ? <RacetrackerCard
              title="Multi-tracker racing is not yet supported"
              subtitle="Select the Racetracker you want to use for racing"
              button=""
              text={
                <List>
                  {connectedTrackers.map(tracker =>
                    <ListItem
                      primaryText={tracker.name}
                      id={tracker.id}
                      onClick={this.handleListClick.bind(this, tracker)}
                    />
                  )}
                </List>
              }
            />
          : null}
        {!isRaceValid && !isRaceActive && connectedTrackers.length === 0
          ? <RacetrackerCard
              title="Racetracker connection required"
              subtitle="Race mode requires the connection of a TBS Racetracker"
              text="Click below to discover, connect, and configure Racetrackers"
              button="Racetracker Management"
            />
          : null}
      </div>
    );
  }
}
