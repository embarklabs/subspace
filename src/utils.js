import createKeccakHash from "keccak";

export function isAddress(address) {
  return /^(0x)?[0-9a-fA-F]{40}$/i.test(address);
}

export function sleep(milliseconds) {
  return new Promise(resolve => setTimeout(resolve, milliseconds));
}

export function toChecksumAddress(address) {
  address = address.toLowerCase().replace("0x", "");
  const hash = createKeccakHash("keccak256")
    .update(address)
    .digest("hex");
  let ret = "0x";

  for (var i = 0; i < address.length; i++) {
    if (parseInt(hash[i], 16) >= 8) {
      ret += address[i].toUpperCase();
    } else {
      ret += address[i];
    }
  }
  return ret;
}
