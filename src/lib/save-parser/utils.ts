// Any non-printable character shouldn't be in an identifier name, regardless of CLR standards.
// This doesn't check for formats, start-with-number, or symbols.  Giving up on vetting those,
//  lots of mods doing weird things.
const REGEX_IDENTIFIER_INVAL_CHARS = /[\x00-\x1F]/;

/**
 * Check if we parsed a meaningful .NET identifier name.
 * If the name looks valid, the name is returned.
 * If the name appears to not be valid, and error is thrown.
 * @param name The name to validate.
 */
export function validateDotNetIdentifierName(
  name: string | null | undefined,
): string {
  if (!name || name.length === 0) {
    throw new Error("A .NET identifier name must not be null or zero length.");
  }

  if (name.length >= 512) {
    // We can reasonably assume anything over 512 characters is a bad parse and not a real template.
    //  Specifically, anything at or over 512 makes a "CS0645: Identifier too long." error in Microsoft's C# compiler.
    //  The .Net standard itself does not specify any limit.
    // We want to bail out in these cases without trying to include the template name in the error, as it is likely to be
    //  enormous.
    throw new Error(
      "A .NET identifier name exceeded 511 characters.  This most likely indicates a parser error.",
    );
  }

  // Since we can no longer check against the regex, we need another way to catch
  //  rogue strings due to parser errors.
  // Null check is the best I can think of right now.
  if (REGEX_IDENTIFIER_INVAL_CHARS.test(name)) {
    throw new Error(
      "A .NET identifier name contains non-printable characters.  This most likely indicates a parser error.",
    );
  }

  return name;
}

export function typedKeys<T extends object>(x: T): (keyof T)[] {
  return Object.keys(x) as (keyof T)[];
}
