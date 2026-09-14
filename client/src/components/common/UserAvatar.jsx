import React from 'react';
import Avatar from './Avatar';

/**
 * Backward-compatible wrapper for the global canonical Avatar component.
 * Maps legacy props (isOnline, showStatus, etc.) directly into Avatar.
 */
const UserAvatar = (props) => {
  return <Avatar {...props} />;
};

export default UserAvatar;
export { UserAvatar, Avatar };
