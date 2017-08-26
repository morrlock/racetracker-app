import React, { Component } from 'react';
import _ from 'lodash';

import { AppBar, List, Divider, Subheader, FlatButton, ListItem, FontIcon } from 'material-ui';

import loadingImg from '../../media/ds-logo-spin.svg';
import TrackerDevice from './TrackerDevice';

import { historyBackButton } from '../../utils';

import './tracker-home.css';

/** Test component to view the other views */
export default class TrackerHome extends Component {
  props: {
    devices: Array<DiscoveryDevice>
  };
  componentWillMount() {
    // on mount automatically poll for bluetooth devices
    this.rescan(); // auto scan for new trackers
  }
  componentWillUnMount() {
    // TODO: disconnect from any connected racetrackers
  }

  /** Create the item list from a device object, maps click events*/
  device(id = 0, device, paired) {
    let deviceLogo = <FontIcon className="ds-blue-text pull-icon-down mdi mdi-timer" />;
    let deviceComponent = <TrackerDevice name={device.name} rssi={device.rssi} />; // todo pass what you need
    if (paired) {
      return (
        <ListItem
          key={id}
          primaryText={deviceComponent}
          leftIcon={deviceLogo}
          rightIcon={<FontIcon className="pull-icon-down mdi mdi-settings" />}
          onClick={() => this.openSettings(device)}
        />
      );
    }
    return (
      <ListItem
        key={id}
        primaryText={deviceComponent}
        leftIcon={deviceLogo}
        onClick={() => this.connect(device)}
      />
    );
  }

  /** Maps the paired devices to the view components */
  pairedDevices() {
    let { paired } = this.state;
    if (_.size(paired) > 0) {
      return _.map(paired, (device, id) => device && this.device(id, device, true));
    }
    return <ListItem disabled primaryText={<span>No paired race trackers</span>} />;
  }

  /** Maps the available devices to the view components */
  availableDevices() {
    let { available } = this.state;
    if (_.size(available) > 0) {
      return _.map(available, (device, id) => device && this.device(id, device));
    }
    return <ListItem disabled primaryText={<span>No available race trackers</span>} />;
  }

  /** Discover all available bluetooth devices */
  discover = () => {
    this.setState({ available: null });
    // todo call action, replace the faked state
    setTimeout(() => {
      this.setState({
        available: [
          {
            name: 'IvoryMarten',
            id: '28-AS-FG-23',
            rssi: '-89'
          },
          {
            name: 'WhiteGoat',
            id: '18-SS-FG-23',
            rssi: '-56'
          },
          (() => {
            if (Math.random() > 0.5) {
              return {
                name: 'BlueGull',
                rssi: '-99'
              };
            }
          })()
        ]
      });
    }, Math.random() * 1000 + 1000);
  };

  /** Open the settings view with the selected device */
  openSettings = device => {
    console.log('opening settings');
    console.log(device);
    this.props.history.push('/tracker/settings', device);
  };

  /** Connect to the current device */
  connect = device => {
    console.log('connecting');
    console.log(device);
    this.setState(state => {
      // todo better handle things with actions
      state.paired.push(device);
      state.available.splice(state.available.indexOf(device), 1);
    });
  };

  render() {
    let { paired, available } = this.state;
    let loadingComponent = (
      <ListItem
        className="center-text"
        disabled
        primaryText={<img src={loadingImg} className="scanning" alt="Loading..." />}
      />
    );
    return (
      <div className="main tracker-home">
        <header>
          <AppBar
            title="RaceTracker"
            iconClassNameLeft="mdi mdi-arrow-left"
            onLeftIconButtonTouchTap={historyBackButton.bind(this)}
          />
        </header>
        <main>
          <List>
            <Subheader className="ds-blue-text">Paired devices</Subheader>
            {(paired && this.pairedDevices()) || loadingComponent}
          </List>
          <Divider />
          <List>
            <Subheader className="ds-blue-text">Available devices</Subheader>
            {(available && this.availableDevices()) || loadingComponent}
          </List>
        </main>
        <footer>
          <FlatButton primary label="rescan" className="right" onClick={this.discover} />
        </footer>
      </div>
    );
  }
}
