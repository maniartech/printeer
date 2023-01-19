import * as os from 'os';

// Checks if the current user is root.
export const isCurrentUserRoot = function():Boolean {
  if (process && process.getuid) {
    return process.getuid() === 0; // UID 0 is always root
  }

  if (os.userInfo().username == 'root') {
    return true;
  }

  return false;
}