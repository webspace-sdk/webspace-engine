import React, { Component } from "react";
import PropTypes from "prop-types";
import cx from "classnames";
import { FormattedMessage } from "react-intl";
import { handleTextFieldFocus, handleTextFieldBlur } from "../utils/focus-utils";

import styles from "../assets/stylesheets/room-settings-dialog.scss";
import DialogContainer from "./dialog-container";
import configs from "../utils/configs";

export default class RoomSettingsDialog extends Component {
  static propTypes = {
    initialSettings: PropTypes.object,
    onChange: PropTypes.func,
    onClose: PropTypes.func,
    showRoomAccessSettings: PropTypes.bool
  };

  constructor(props) {
    super(props);
    this.state = props.initialSettings;
  }

  onSubmit = e => {
    e.preventDefault();
    e.stopPropagation();
    this.props.onChange(this.state);
    this.props.onClose();
  };

  onRoomAccessSettingsChange = e =>
    this.setState({
      allow_promotion: e.target.value === "public"
    });

  renderCheckbox(member_permission, disabled, onChange) {
    return (
      <label className={cx(styles.permission, { [styles.permissionDisabled]: disabled })} key={member_permission}>
        <input
          type="checkbox"
          checked={this.state.member_permissions[member_permission]}
          disabled={disabled}
          onChange={
            onChange ||
            (e =>
              this.setState({
                member_permissions: { ...this.state.member_permissions, [member_permission]: e.target.checked }
              }))
          }
        />
        <FormattedMessage id={`room-settings.${member_permission}`} />
      </label>
    );
  }

  render() {
    const { showRoomAccessSettings } = this.props;

    const maxRoomSize = configs.feature("max_room_size");

    return (
      <DialogContainer title="Room Settings" {...this.props}>
        <form onSubmit={this.onSubmit} className={styles.roomSettingsForm}>
          <span className={styles.subtitle}>
            <FormattedMessage id="room-settings.name-subtitle" />
          </span>
          <input
            name="name"
            type="text"
            required
            autoComplete="off"
            placeholder="Room name"
            value={this.state.name}
            onFocus={e => handleTextFieldFocus(e.target)}
            onBlur={() => handleTextFieldBlur()}
            onChange={e => this.setState({ name: e.target.value })}
            className={styles.nameField}
          />
          <span className={styles.subtitle}>
            <FormattedMessage id="room-settings.description-subtitle" />
          </span>
          <textarea
            name="description"
            rows="5"
            autoComplete="off"
            placeholder="Room description"
            value={this.state.description || ""}
            onFocus={e => handleTextFieldFocus(e.target)}
            onBlur={() => handleTextFieldBlur()}
            onChange={e => this.setState({ description: e.target.value })}
            className={styles.descriptionField}
          />
          <span className={styles.subtitle}>
            <FormattedMessage id="room-settings.room-size-subtitle" />
          </span>
          <div className={styles.memberCapContainer}>
            <input
              name="room_size"
              type="number"
              required
              min={0}
              max={maxRoomSize}
              placeholder="Member Limit"
              value={this.state.room_size}
              onFocus={e => handleTextFieldFocus(e.target)}
              onBlur={() => handleTextFieldBlur()}
              onChange={e => this.setState({ room_size: e.target.value })}
              className={styles.nameField}
            />
          </div>
          {showRoomAccessSettings && (
            <>
              <span className={styles.subtitle}>
                <FormattedMessage id="room-settings.room-access-subtitle" />
              </span>
              <div className={styles.selectContainer}>
                <label>
                  <input
                    type="radio"
                    value="private"
                    checked={!this.state.allow_promotion}
                    onChange={this.onRoomAccessSettingsChange}
                  />
                  <div>
                    <FormattedMessage id="room-settings.access-private" />
                    <span>
                      <FormattedMessage id="room-settings.access-private-subtitle" />
                    </span>
                  </div>
                </label>
                <label>
                  <input
                    type="radio"
                    value="public"
                    checked={this.state.allow_promotion}
                    onChange={this.onRoomAccessSettingsChange}
                  />
                  <div>
                    <FormattedMessage id="room-settings.access-public" />
                    <span>
                      <FormattedMessage id="room-settings.access-public-subtitle" />
                    </span>
                  </div>
                </label>
              </div>
            </>
          )}
          <span className={styles.subtitle}>
            <FormattedMessage id="room-settings.permissions-subtitle" />
          </span>
          <button type="submit" className={styles.nextButton}>
            <FormattedMessage id="room-settings.apply" />
          </button>
        </form>
      </DialogContainer>
    );
  }
}
