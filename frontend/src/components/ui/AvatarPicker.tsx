import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";
import { AVATARS, AVATAR_IDS, type AvatarId } from "../art/assets";

/** A grid of the eight child avatars. The chosen one gets a green ring. */
export default function AvatarPicker({ value, onChange, dark = false }: { value: AvatarId; onChange: (id: AvatarId) => void; dark?: boolean }) {
  return (
    <View style={styles.grid}>
      {AVATAR_IDS.map((id) => {
        const on = id === value;
        return (
          <Pressable
            key={id}
            onPress={() => onChange(id)}
            accessibilityRole="button"
            accessibilityLabel={`Avatar: ${id}`}
            accessibilityState={{ selected: on }}
            style={[styles.cell, dark && styles.cellDark, on && styles.on]}
          >
            <Image source={AVATARS[id]} contentFit="contain" style={styles.image} />
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, justifyContent: "center" },
  cell: {
    width: "22%",
    aspectRatio: 1,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: "#E6D8BC",
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  cellDark: { backgroundColor: "#36231A", borderColor: "#5A3F2A" },
  on: { borderColor: "#45A94A", backgroundColor: "#E3F7DC" },
  image: { width: "86%", height: "86%" },
});
