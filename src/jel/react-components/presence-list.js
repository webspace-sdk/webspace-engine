import PropTypes from "prop-types";
import styled from "styled-components";
import React, { useState, useEffect, forwardRef } from "react";
import List from "rc-virtual-list";
import { outerHeight } from "../utils/layout-utils";
import styles from "../assets/stylesheets/presence-list.scss";

const PresenceListMemberItem = forwardRef(({ meta: { profile: { displayName } } }, ref) => {
  return (
    <div style={{ height: "64px" }} ref={ref}>
      {displayName}
    </div>
  );
});

PresenceListMemberItem.displayName = "PresenceListMemberItem";
PresenceListMemberItem.propTypes = {
  meta: PropTypes.object
};

const ListWrap = styled.div`
  height: 100%;
`;

function PresenceList({ spacePresences, hubId }) {
  const [height, setHeight] = useState(100);
  const outerRef = React.createRef();
  const data = [];

  useEffect(
    () => {
      const setOuterHeight = () => {
        if (outerRef.current) {
          const height = outerHeight(outerRef.current);
          console.log(height);
          setHeight(height);
        }
      };

      setOuterHeight();
      window.addEventListener("resize", setOuterHeight);
      return () => window.removeEventListener("resize", setOuterHeight);
    },
    [outerRef]
  );

  for (const [sessionId, presence] of Object.entries(spacePresences)) {
    const meta = presence.metas[presence.metas.length - 1];
    if (meta.hub_id === hubId) {
      for (let i = 0; i < 100; i++) {
        data.push({ key: `${sessionId}${i}`, meta, type: "member" });
      }
    }
  }

  return (
    <ListWrap ref={outerRef} className={styles.presenceList}>
      <List virtual={true} itemHeight={64} height={height} itemKey="key" data={data}>
        {(item, _, props) => {
          if (item.type === "member") {
            return <PresenceListMemberItem {...item} {...props} />;
          }
        }}
      </List>
    </ListWrap>
  );
}

PresenceList.propTypes = {
  spacePresences: PropTypes.object,
  hubId: PropTypes.string
};

export { PresenceList as default };
