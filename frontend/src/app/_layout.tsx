import { Baloo2_800ExtraBold } from "@expo-google-fonts/baloo-2";
import { Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar, View } from "react-native";
import { TransitionProvider } from "../components/transition/TransitionHost";
import { colors } from "../theme/colors";

export default function RootLayout() {
  const [loaded, failed] = useFonts({ Baloo2_800ExtraBold, Nunito_700Bold, Nunito_800ExtraBold });

  // Show the splash colour until the fonts are ready (if they fail, carry on with system fonts).
  if (!loaded && !failed) return <View style={{ flex: 1, backgroundColor: colors.brown }} />;

  return (
    <>
      <StatusBar barStyle="dark-content" />
      <TransitionProvider>
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }} />
      </TransitionProvider>
    </>
  );
}
