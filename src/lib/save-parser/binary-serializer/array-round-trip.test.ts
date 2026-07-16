import { describe, expect, it } from "vitest";
import { ArrayDataReader } from "./data-reader";
import { ArrayDataWriter } from "./data-writer";

describe("array serializer", () => {
  it("round-trips primitive values and strings", () => {
    const writer = new ArrayDataWriter();
    writer.writeByte(255);
    writer.writeSByte(-12);
    writer.writeUInt16(65535);
    writer.writeInt16(-1234);
    writer.writeUInt32(4_000_000_000);
    writer.writeInt32(-123_456_789);
    writer.writeSingle(12.5);
    writer.writeDouble(Math.PI);
    writer.writeKleiString("Onismith ✓");
    writer.writeKleiString("");
    writer.writeKleiString(null);

    const reader = new ArrayDataReader(writer.getBytes());
    expect(reader.readByte()).toBe(255);
    expect(reader.readSByte()).toBe(-12);
    expect(reader.readUInt16()).toBe(65535);
    expect(reader.readInt16()).toBe(-1234);
    expect(reader.readUInt32()).toBe(4_000_000_000);
    expect(reader.readInt32()).toBe(-123_456_789);
    expect(reader.readSingle()).toBe(12.5);
    expect(reader.readDouble()).toBeCloseTo(Math.PI);
    expect(reader.readKleiString()).toBe("Onismith ✓");
    expect(reader.readKleiString()).toBe("");
    expect(reader.readKleiString()).toBeNull();
    expect(reader.bytesRemaining).toBe(0);
  });

  it("rejects reads past the end of the buffer", () => {
    const reader = new ArrayDataReader(new ArrayBuffer(1));
    expect(() => reader.readUInt16()).toThrow("Buffer length exceeded");
  });
});
