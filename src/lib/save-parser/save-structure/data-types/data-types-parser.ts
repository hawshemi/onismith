import {
  ParseIterator,
  UnparseIterator,
  readSingle,
  writeSingle,
} from "../../parser";

import { Vector3, Quaternion } from "./data-types";

export function* parseVector3(): ParseIterator<Vector3> {
  return {
    x: yield readSingle(),
    y: yield readSingle(),
    z: yield readSingle(),
  };
}
export function* unparseVector3(value: Vector3): UnparseIterator {
  yield writeSingle(value.x);
  yield writeSingle(value.y);
  yield writeSingle(value.z);
}

export function* parseQuaternion(): ParseIterator<Quaternion> {
  return {
    x: yield readSingle(),
    y: yield readSingle(),
    z: yield readSingle(),
    w: yield readSingle(),
  };
}
export function* unparseQuaternion(value: Quaternion): UnparseIterator {
  yield writeSingle(value.x);
  yield writeSingle(value.y);
  yield writeSingle(value.z);
  yield writeSingle(value.w);
}
