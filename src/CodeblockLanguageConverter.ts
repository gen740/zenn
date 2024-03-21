export const convertCodeblockLanguage = (language: string) => {
  switch (language) {
    case "c++":
      return "cpp";
    case "c#":
      return "csharp";
  }
  return language;
};
