import * as SecureStore from 'expo-secure-store';

const CREDENTIALS_KEY = 'barberinsane.biometric_credentials';
const FLAG_KEY = 'barberinsane.biometric_enabled';

export interface StoredCredentials {
  email: string;
  password: string;
}

export async function guardarCredencialesBiometricas(
  email: string,
  password: string,
): Promise<boolean> {
  try {
    await SecureStore.setItemAsync(CREDENTIALS_KEY, JSON.stringify({ email, password }), {
      requireAuthentication: true,
    });
    await SecureStore.setItemAsync(FLAG_KEY, '1');
    return true;
  } catch {
    return false;
  }
}

export async function biometriaHabilitada(): Promise<boolean> {
  try {
    const flag = await SecureStore.getItemAsync(FLAG_KEY);
    return flag === '1';
  } catch {
    return false;
  }
}

/** Lee las credenciales; el SO muestra el prompt biométrico. Cancela => null. */
export async function leerCredencialesBiometricas(): Promise<StoredCredentials | null> {
  try {
    const raw = await SecureStore.getItemAsync(CREDENTIALS_KEY, { requireAuthentication: true });
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredCredentials;
    if (!parsed.email || !parsed.password) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function borrarCredencialesBiometricas(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CREDENTIALS_KEY);
    await SecureStore.deleteItemAsync(FLAG_KEY);
  } catch {
    // ignorar
  }
}
