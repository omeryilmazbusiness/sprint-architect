import { Redirect, useLocalSearchParams } from "expo-router";

/** Legacy route — deep links to /users redirect to the Guests tab. */
export default function UsersTabRedirect() {
  const params = useLocalSearchParams<Record<string, string>>();
  return (
    <Redirect
      href={{
        pathname: "/(manager-tabs)/guests",
        params,
      }}
    />
  );
}
