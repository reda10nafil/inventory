/*
 * @Description: 
 */

// Powered by OnSpace.AI
import { useRouter } from '../navigation/compat';
import { TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/ui/AppIcon';
import { Backdrop } from '../../components/ui/Backdrop';
import { GradientFill } from '../../components/ui/GradientFill';
import { Text } from '../../components/ui/Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';

export default function NotFoundScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <Backdrop />

      <View style={styles.content}>
        <AppIcon name="photo-camera" size={80} color={t.colors.accentInk} />
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.message}>
          The moment you're looking for seems to have been lost in the shadows.
        </Text>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.push('/')}
        >
          <GradientFill gradient={t.gradients.button} style={{ borderRadius: t.radius.button }} />
          <Text style={styles.homeButtonText}>Return Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const useStyles = makeStyles((t) => ({
  container: {
    flex: 1,
    backgroundColor: t.colors.background,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: t.colors.textPrimary,
    marginTop: 20,
    marginBottom: 10,
  },
  message: {
    fontSize: 16,
    color: t.colors.textSecondary,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  homeButton: {
    backgroundColor: t.colors.button,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: t.radius.button,
    overflow: 'hidden',
    ...t.shadows.button,
  },
  homeButtonText: {
    color: t.colors.onButton,
    fontWeight: '600',
    fontSize: 16,
  },
}));
