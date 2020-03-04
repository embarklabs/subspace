import createKeccakHash from "keccak";
import {map} from "rxjs/operators";

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

export function mapFunc(observable) {
  return prop => observable.pipe(
    map(x => {
      if (typeof prop === "string") {
        return x[prop];
      }
      if (Array.isArray(prop)) {
        let newValues = {};
        prop.forEach(p => {
          newValues[p] = x[p];
        });
        return newValues;
      }
    })
  );
}
