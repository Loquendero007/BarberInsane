import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { AppText, Button, StarRating, TextField } from '@/components/ui';
import { colors, radius, spacing } from '@/theme';

interface ModalResenaProps {
  visible: boolean;
  titulo: string;
  cerrar: () => void;
  guardar: (rating: number, comentario: string | null) => Promise<void>;
}

export function ModalResena({ visible, titulo, cerrar, guardar }: ModalResenaProps) {
  const [rating, setRating] = useState(5);
  const [comentario, setComentario] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const confirmar = async () => {
    setGuardando(true);
    setError(null);
    try {
      await guardar(rating, comentario.trim() ? comentario.trim() : null);
      setRating(5);
      setComentario('');
      cerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar tu reseña');
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={cerrar}>
      <Pressable style={styles.fondo} onPress={cerrar}>
        <Pressable style={styles.contenedor} onPress={(e) => e.stopPropagation()}>
          <View style={styles.icono}>
            <MaterialCommunityIcons name="star" size={28} color={colors.gold} />
          </View>
          <AppText variant="subtitle" center>
            {titulo}
          </AppText>
          <AppText variant="small" center>
            ¿Qué tal estuvo tu servicio?
          </AppText>

          <View style={styles.estrellas}>
            <StarRating rating={rating} size={34} interactive onChange={setRating} />
          </View>

          <TextField
            label="Comentario (opcional)"
            value={comentario}
            onChangeText={setComentario}
            placeholder="Corte impecable, ¡volveré!"
            multiline
            numberOfLines={3}
            style={styles.campo}
          />

          {error ? <AppText variant="caption" color={colors.danger}>{error}</AppText> : null}

          <View style={styles.botones}>
            <Button title="Enviar reseña" icon="star" loading={guardando} onPress={confirmar} />
            <Button title="Ahora no" variant="ghost" onPress={cerrar} />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colors.overlay,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  contenedor: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
  },
  icono: {
    alignSelf: 'center',
    width: 56,
    height: 56,
    borderRadius: radius.pill,
    backgroundColor: colors.warningSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estrellas: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  campo: {
    minHeight: 80,
  },
  botones: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
