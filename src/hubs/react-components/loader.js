import React, { Component } from "react";
import PropTypes from "prop-types";
import { FormattedMessage } from "react-intl";
import { WrappedIntlProvider } from "./wrapped-intl-provider";
import UnlessFeature from "./unless-feature";

import configs from "../utils/configs";
import loaderStyles from "../../assets/hubs/stylesheets/loader.scss";
import { LOADING_EVENTS, LOADED_EVENTS, ERROR_EVENTS } from "../utils/media-utils";

class Loader extends Component {
  static propTypes = {
    scene: PropTypes.object,
    finished: PropTypes.bool,
    onLoaded: PropTypes.func
  };

  doneWithInitialLoad = false;
  state = {
    loadingNum: 0,
    loadedNum: 0
  };

  componentDidMount() {
    for (const ev of LOADING_EVENTS) {
      this.props.scene.addEventListener(ev, this.onObjectLoading);
    }

    for (const ev of [...LOADED_EVENTS, ...ERROR_EVENTS]) {
      this.props.scene.addEventListener(ev, this.onObjectLoaded);
    }
  }

  componentWillUnmount() {
    for (const ev of LOADING_EVENTS) {
      this.props.scene.removeEventListener(ev, this.onObjectLoading);
    }

    for (const ev of [...LOADED_EVENTS, ...ERROR_EVENTS]) {
      this.props.scene.removeEventListener(ev, this.onObjectLoaded);
    }
  }

  onObjectLoading = () => {
    if (!this.doneWithInitialLoad && this.loadingTimeout) {
      window.clearTimeout(this.loadingTimeout);
      this.loadingTimeout = null;
    }

    this.setState(state => {
      return { loadingNum: state.loadingNum + 1 };
    });
  };

  onObjectLoaded = () => {
    this.setState(state => {
      return { loadedNum: state.loadedNum + 1 };
    });

    this.tryFinishLoading();
  };

  tryFinishLoading = () => {
    if (!this.doneWithInitialLoad && this.loadingTimeout) window.clearTimeout(this.loadingTimeout);

    this.loadingTimeout = window.setTimeout(() => {
      this.doneWithInitialLoad = true;
      if (this.props.onLoaded) {
        this.props.onLoaded();
      }
    }, 1500);
  };

  render() {
    const nomore = (
      <h4 className={loaderStyles.loadingText}>
        <FormattedMessage id="loader.entering_lobby" />
      </h4>
    );
    const progress =
      this.state.loadingNum === 0
        ? " "
        : `${Math.min(this.state.loadedNum, this.state.loadingNum)} / ${this.state.loadingNum} `;
    const usual = (
      <h4 className={loaderStyles.loadingText}>
        <FormattedMessage id="loader.loading" />
        {progress}
        <FormattedMessage id={this.state.loadingNum !== 1 ? "loader.objects" : "loader.object"} />
        ...
      </h4>
    );
    return (
      <WrappedIntlProvider>
        <div className="loading-panel">
          <img className="loading-panel__logo" src={configs.image("logo")} />
          <UnlessFeature name="hide_powered_by">
            <div className="loading-panel__powered-by">
              <span className="loading-panel__powered-by__prefix">
                <FormattedMessage id="home.powered_by_prefix" />
              </span>
              <a href="https://hubs.mozilla.com/cloud">
                <FormattedMessage id="home.powered_by_link" />
              </a>
            </div>
          </UnlessFeature>

          {this.props.finished ? nomore : usual}

          <div className="loader-wrap loader-bottom">
            <div className="loader">
              <div className="loader-center" />
            </div>
          </div>
        </div>
      </WrappedIntlProvider>
    );
  }
}

export default Loader;
