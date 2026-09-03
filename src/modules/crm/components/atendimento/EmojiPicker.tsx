// Wrapper isolado do emoji-mart para permitir code-splitting via React.lazy.
// Rendered em Suspense a partir de InboxConversa quando o botão 😊 abre.
import Picker from '@emoji-mart/react';
import data from '@emoji-mart/data';

interface Props {
  onSelect: (emoji: string) => void;
}

export default function EmojiPicker({ onSelect }: Props) {
  return (
    <Picker
      data={data}
      set="native"
      locale="pt"
      theme="dark"
      previewPosition="none"
      skinTonePosition="none"
      emojiSize={20}
      emojiButtonSize={32}
      perLine={9}
      onEmojiSelect={(e: { native: string }) => onSelect(e.native)}
    />
  );
}
