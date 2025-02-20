import dumpProcessor from "../services/dumpProcessor";
import he from "he";

describe("Entity decoding", () => {
  it("should handle empty string", () => {
    expect(he.decode("")).toEqual("");
  });
  it("should handle single ampersand", () => {
    expect(he.decode("&")).toEqual("&");
  });
  it("should handle incomplete entity", () => {
    expect(he.decode("&a")).toEqual("&a");
  });
  it("should handle invalid numeric entities", () => {
    expect(he.decode("&#2013266066;")).toEqual(String.fromCharCode(65533));
  });
  it("should he.decode numeric entities without semicolon", () => {
    expect(he.decode("&#34C&#34")).toEqual('"C"');
  });
  it("should he.decode incomplete named entities followed by alphanumeric characters", () => {
    expect(he.decode("&uumlber")).toEqual("über");
  });
  it("Entity decoding", async () => {
    expect(dumpProcessor.strTransform(null)).toEqual("''");
    expect(dumpProcessor.strTransform("nothing being replaced")).toEqual(
      "'nothing being replaced'"
    );
    expect(dumpProcessor.strTransform("It's encoded")).toEqual(
      "'It''s encoded'"
    );
    expect(
      dumpProcessor.strTransform("JRNL 1102: Journalist&#8217;s Toolbox")
    ).toEqual("'JRNL 1102: Journalist’s Toolbox'");
    expect(
      dumpProcessor.strTransform(
        "MUSI 3341: Music Recording 3&#8212;Mixing and Mastering"
      )
    ).toEqual("'MUSI 3341: Music Recording 3—Mixing and Mastering'");
    expect(dumpProcessor.strTransform("&#x2020;")).toEqual("'†'");
    expect(dumpProcessor.strTransform("&#9639; box")).toEqual("'▧ box'");
    expect(dumpProcessor.strTransform("&#9576;")).toEqual("'╨'");
    expect(dumpProcessor.strTransform("&#9677; 'sd'")).toEqual("'◍ ''sd'''");
    expect(dumpProcessor.strTransform("&#2602; random symbol")).toEqual(
      "'ਪ random symbol'"
    );
    expect(dumpProcessor.strTransform("&#10062;' 'checkmark")).toEqual(
      "'❎'' ''checkmark'"
    );
  });
});
