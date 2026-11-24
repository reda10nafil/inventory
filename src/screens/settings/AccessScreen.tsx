// Impostazioni › Persone e telefoni › Accesso (ACC1, ticket 32; UX0 piano-fette «ACC1 e RETE0», R9 R13). Senza login:
// il profilo dell'operatore di questo telefono (foto in un cerchio da 56, nome, telefono, ruolo), il nome del telefono,
// l'account detto com'è («Spazio locale», nessun accesso, «Backup Google Drive» spento col motivo) e i ruoli con i
// permessi. Tutto si salva da solo su questo telefono (`device:v1:profile`, `device:v1:permissions`, ProfileContext);
// aprire la schermata non scrive nulla. I ruoli si cambiano dal telefono stesso: lo dice una riga onesta.
import React, { useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Switch, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppIcon } from '../../../components/ui/AppIcon';
import { Backdrop } from '../../../components/ui/Backdrop';
import { cardSurface } from '../../../components/ui/surfaces';
import { Text, TextInput } from '../../../components/ui/Text';
import { PermissionNote } from '../../../components/PermissionNote';
import { makeStyles, useTheme } from '../../../contexts/ThemeContext';
import { useProfile } from '../../../contexts/ProfileContext';
import { LOGIN_ENABLED } from '../../../contexts/AuthContext';
import { ACTIONS, ROLES, can as canRole, deniedReason, isFixed, roleName, type Role } from '../../../utils/roles';
import { withAlpha } from '../../../utils/color';
import { pickProfilePhoto } from '../../lib/profilePhoto';

const EDITABLE_ROLES = ROLES.filter((r) => r.id !== 'titolare');
const EDITABLE_ACTIONS = ACTIONS.filter((a) => a.id !== 'ruoli');

export default function AccessScreen() {
  const t = useTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { profile, permissions, loaded, updateProfile, setPermission, can } = useProfile();
  // Testi scritti: si mostrano come li si scrive e si salvano puliti a ogni tasto (si rileggono dopo una ricarica)
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [device, setDevice] = useState(profile.device);
  const [photoError, setPhotoError] = useState('');
  const [editRole, setEditRole] = useState<Role>('operatore');
  useEffect(() => {
    if (!loaded) return;
    setName(profile.name); setPhone(profile.phone); setDevice(profile.device);
    // solo alla lettura dello storage: dopo, i testi li tiene chi scrive
  }, [loaded]);

  const manage = can('ruoli');

  const choosePhoto = async () => {
    setPhotoError('');
    const r = await pickProfilePhoto();
    if ('photo' in r) updateProfile({ photo: r.photo });
    else if ('error' in r) setPhotoError(r.error);
  };

  return (
    <View style={styles.container}>
      <Backdrop />
      <ScrollView contentContainerStyle={{ padding: t.spacing.screenPadding, paddingBottom: insets.bottom + 24 }} keyboardShouldPersistTaps="handled">
        {/* PROFILO */}
        <Text style={styles.sectionTitle}>Il tuo profilo</Text>
        <View style={styles.card}>
          <View style={styles.profileTop}>
            <Pressable
              onPress={() => void choosePhoto()}
              style={styles.avatar}
              accessibilityRole="button"
              accessibilityLabel={profile.photo ? 'Cambia la foto del profilo' : 'Aggiungi una foto del profilo'}
              testID="foto-profilo"
            >
              {profile.photo
                ? <Image source={{ uri: profile.photo }} style={styles.avatarImage} resizeMode="cover" accessibilityIgnoresInvertColors />
                : <AppIcon name="person" size={30} color={t.colors.textSecondary} />}
            </Pressable>
            <View style={styles.profileTexts}>
              <TextInput
                value={name}
                onChangeText={(v) => { setName(v); updateProfile({ name: v }); }}
                placeholder="Il tuo nome"
                placeholderTextColor={t.colors.placeholder}
                style={styles.nameInput}
                accessibilityLabel="Nome dell'operatore"
                maxLength={60}
              />
              <Text style={styles.roleLine}>{roleName(profile.role)}</Text>
            </View>
          </View>
          <View style={styles.photoActions}>
            <Pressable onPress={() => void choosePhoto()} hitSlop={8} accessibilityRole="button">
              <Text style={styles.link}>{profile.photo ? 'Cambia la foto' : 'Scegli una foto'}</Text>
            </Pressable>
            {profile.photo ? (
              <Pressable onPress={() => { setPhotoError(''); updateProfile({ photo: '' }); }} hitSlop={8} accessibilityRole="button">
                <Text style={styles.link}>Togli la foto</Text>
              </Pressable>
            ) : null}
          </View>
          {photoError ? <Text style={styles.error}>{photoError}</Text> : null}
          <View style={styles.divider} />
          <Text style={styles.label}>Telefono</Text>
          <TextInput
            value={phone}
            onChangeText={(v) => { setPhone(v); updateProfile({ phone: v }); }}
            placeholder="Es. 333 123 4567"
            placeholderTextColor={t.colors.placeholder}
            keyboardType="phone-pad"
            style={styles.input}
            accessibilityLabel="Numero di telefono dell'operatore"
            maxLength={30}
          />
          <Text style={styles.hint}>Si salva da solo, solo su questo telefono.</Text>
        </View>

        {/* QUESTO TELEFONO */}
        <Text style={styles.sectionTitle}>Questo telefono</Text>
        <View style={styles.card}>
          <Text style={styles.label}>Nome del telefono</Text>
          <TextInput
            value={device}
            onChangeText={(v) => { setDevice(v); updateProfile({ device: v }); }}
            placeholder="Es. Banco 1"
            placeholderTextColor={t.colors.placeholder}
            style={styles.input}
            accessibilityLabel="Nome del telefono"
            maxLength={60}
          />
          <Text style={styles.hint}>Compare nella Cronologia accanto al tuo nome.</Text>
        </View>

        {/* ACCOUNT: detto com'è (login spento, LOGIN_ENABLED = false) */}
        <Text style={styles.sectionTitle}>Account</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.iconWrap}><AppIcon name="phone-android" size={20} color={t.colors.textSecondary} /></View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Spazio locale</Text>
              <Text style={styles.rowSub}>Nessun accesso: i dati restano su questo telefono.</Text>
            </View>
          </View>
          <View style={styles.rowLine} />
          <View style={[styles.row, styles.off]}>
            <View style={styles.iconWrap}><AppIcon name="account-circle" size={20} color={t.colors.textSecondary} /></View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Accesso con Google</Text>
              <Text style={styles.rowSub}>{LOGIN_ENABLED ? 'Acceso' : 'Spento per ora: arriverà con gli account.'}</Text>
            </View>
          </View>
          <View style={styles.rowLine} />
          <View style={[styles.row, styles.off]}>
            <View style={styles.iconWrap}><AppIcon name="cloud-upload" size={20} color={t.colors.textSecondary} /></View>
            <View style={styles.rowTexts}>
              <Text style={styles.rowTitle}>Backup Google Drive</Text>
              <Text style={styles.rowSub}>Spento: serve l'accesso con Google, che oggi non c'è.</Text>
            </View>
          </View>
        </View>

        {/* RUOLO DI QUESTO TELEFONO */}
        <Text style={styles.sectionTitle}>Ruolo su questo telefono</Text>
        <View style={styles.card}>
          {ROLES.map((r, i) => {
            const selected = profile.role === r.id;
            return (
              <React.Fragment key={r.id}>
                {i > 0 && <View style={styles.rowLine} />}
                <Pressable
                  style={styles.row}
                  onPress={() => updateProfile({ role: r.id })}
                  accessibilityRole="radio"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={`Ruolo ${r.name}`}
                >
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowTitle}>{r.name}</Text>
                    <Text style={styles.rowSub}>{r.description}</Text>
                  </View>
                  <AppIcon
                    name={selected ? 'radio-button-checked' : 'radio-button-unchecked'}
                    size={22}
                    color={selected ? t.colors.checkOn : t.colors.checkRing}
                  />
                </Pressable>
              </React.Fragment>
            );
          })}
          <Text style={styles.honest}>I ruoli diventano sicuri con gli account: oggi valgono su questo telefono e si cambiano da qui.</Text>
        </View>

        {/* PERMESSI: li cambia solo il Titolare */}
        <Text style={styles.sectionTitle}>Che cosa può fare ogni ruolo</Text>
        <View style={styles.card}>
          <Text style={styles.hint}>Il Titolare può tutto e solo lui cambia questi permessi.</Text>
          {!manage && <PermissionNote text={deniedReason(profile.role, 'ruoli')} style={styles.noteInCard} />}
          <View style={styles.chips}>
            {EDITABLE_ROLES.map((r) => {
              const active = editRole === r.id;
              return (
                <Pressable
                  key={r.id}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => setEditRole(r.id)}
                  accessibilityRole="tab"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{r.name}</Text>
                </Pressable>
              );
            })}
          </View>
          {EDITABLE_ACTIONS.map((a, i) => {
            const value = canRole(editRole, a.id, permissions);
            const label = `${a.name}: ${roleName(editRole)}`;
            return (
              <React.Fragment key={a.id}>
                {i > 0 && <View style={styles.rowLine} />}
                <View style={styles.row}>
                  <View style={styles.rowTexts}>
                    <Text style={styles.rowTitle}>{a.name}</Text>
                    <Text style={styles.rowSub}>Vale in: {a.where}</Text>
                  </View>
                  {manage && !isFixed(editRole, a.id) ? (
                    <Switch
                      value={value}
                      onValueChange={(v) => setPermission(editRole, a.id, v)}
                      accessibilityLabel={label}
                      trackColor={{ false: t.colors.checkRing, true: withAlpha(t.colors.accent, 0.502) }}
                      thumbColor={value ? t.colors.accent : t.colors.textMuted}
                    />
                  ) : (
                    <Text style={styles.yesNo} accessibilityLabel={`${label}: ${value ? 'sì' : 'no'}`}>{value ? 'Sì' : 'No'}</Text>
                  )}
                </View>
              </React.Fragment>
            );
          })}
          <Text style={styles.honest}>Nel resto dell'app i permessi arriveranno con gli account.</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = makeStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.background },
  sectionTitle: {
    ...t.typography.sectionHeader,
    lineHeight: 18,
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    ...cardSurface(t),
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 8,
  },
  profileTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.iconWrap,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  avatarImage: { width: 56, height: 56 },
  profileTexts: { flex: 1 },
  nameInput: {
    fontSize: 20,
    fontWeight: t.weights.strong,
    color: t.colors.inputText,
    paddingVertical: 6,
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.inputBorder === t.colors.input ? t.colors.border : t.colors.inputBorder,
  },
  roleLine: { ...t.typography.caption, fontSize: 13, marginTop: 4 },
  photoActions: { flexDirection: 'row', gap: 20, marginTop: 12 },
  link: { fontSize: 14, lineHeight: 20, fontWeight: t.weights.strong, color: t.colors.accentInk, paddingVertical: 4 },
  error: { fontSize: 13, lineHeight: 18, color: t.colors.error, marginTop: 6 },
  divider: { height: 1, backgroundColor: t.colors.borderLight, marginVertical: 12 },
  label: { ...t.typography.cardLabel, fontSize: 13, marginBottom: 4 },
  input: {
    minHeight: t.input.height,
    color: t.colors.inputText,
    backgroundColor: t.colors.input,
    borderRadius: t.radius.input,
    borderWidth: 1,
    borderColor: t.colors.inputBorder === t.colors.input ? t.colors.border : t.colors.inputBorder,
    paddingHorizontal: 14,
    fontSize: 15,
  },
  hint: { ...t.typography.caption, fontSize: 12, lineHeight: 17, marginTop: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 8 },
  rowLine: { height: 1, backgroundColor: t.colors.borderLight },
  off: { opacity: 0.55 },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: t.radius.iconWrap,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.iconWrap,
  },
  rowTexts: { flex: 1 },
  rowTitle: { ...t.typography.cardTitle, fontSize: 15, fontWeight: t.weights.strong },
  rowSub: { ...t.typography.caption, fontSize: 13, lineHeight: 18, marginTop: 1 },
  honest: { ...t.typography.caption, fontSize: 12, lineHeight: 17, marginTop: 8, color: t.colors.textSecondary },
  noteInCard: { marginTop: 8, marginBottom: 0 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10, marginBottom: 4 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: t.radius.chip,
    borderWidth: 1,
    borderColor: t.colors.chipBorder === t.colors.chip ? t.colors.border : t.colors.chipBorder,
    backgroundColor: t.colors.chip,
  },
  chipActive: { backgroundColor: t.colors.chipActive, borderColor: t.colors.chipActiveBorder },
  chipText: { fontSize: 14, fontWeight: '500', color: t.colors.chipText },
  chipTextActive: { fontWeight: '600', color: t.colors.chipActiveText },
  yesNo: { fontSize: 15, fontWeight: t.weights.strong, color: t.colors.textSecondary, minWidth: 32, textAlign: 'right' },
}));
