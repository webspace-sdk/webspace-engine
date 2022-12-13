import React, {Component} from "react";

export default function withPropsChecker(WrappedComponent) {
  return class PropsChecker extends Component {
    UNSAFE_componentWillReceiveProps(nextProps) {
      Object.keys(this.props)
        .filter(key => typeof nextProps[key] === undefined)
        .map(key => {
          console.log("missing property:", key);
        });

      Object.keys(nextProps)
        .filter(key => {
          return nextProps[key] !== this.props[key];
        })
        .map(key => {
          console.log("changed property:", key, "from", this.props[key], "to", nextProps[key]);
        });
    }
    render() {
      return <WrappedComponent {...this.props} />;
    }
  };
}
