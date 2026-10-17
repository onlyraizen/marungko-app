import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { colors } from "../../theme/colors";
import { font } from "../../theme/fonts";
import BookCard from "./BookCard";
import type { BookView } from "./books";

type Props = { books: readonly BookView[]; onOpen: (book: BookView) => void };

/** The home screen: three books on a shelf. A book opens once the one before it is finished. */
export default function Shelf({ books, onOpen }: Props) {
  const [shake, setShake] = useState<{ id: string; n: number }>({ id: "", n: 0 });
  const [hint, setHint] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current !== null) clearTimeout(timer.current);
    },
    [],
  );

  const press = (book: BookView, index: number) => {
    if (book.status !== "locked") {
      onOpen(book);
      return;
    }
    setShake((current) => ({ id: book.id, n: current.n + 1 }));
    const before = books[index - 1];
    setHint(`Tapusin muna ang ${before?.title ?? "nakaraang libro"}.`);
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = setTimeout(() => setHint(null), 2600);
  };

  return (
    <View style={styles.root}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.heading}>Piliin ang libro</Text>
        {books.map((book, index) => (
          <BookCard
            key={book.id}
            view={book}
            index={index}
            shakeKey={shake.id === book.id ? shake.n : 0}
            onPress={() => press(book, index)}
          />
        ))}
      </ScrollView>
      {hint ? (
        <View style={styles.hint}>
          <Text style={styles.hintText}>{hint}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: { paddingHorizontal: 20, paddingTop: 22, paddingBottom: 48 },
  heading: { fontFamily: font.display, fontSize: 30, color: colors.ink },
  hint: { position: "absolute", left: 20, right: 20, bottom: 28, backgroundColor: "rgba(58,34,16,0.94)", borderRadius: 14, padding: 14 },
  hintText: { fontFamily: font.bold, fontSize: 15, color: "#FFFFFF", textAlign: "center" },
});
