
export function randomString() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export function isAddress(address) {
  return /^(0x)?[0-9a-fA-F]{40}$/i.test(address)
};


export function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
};
