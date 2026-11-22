/*
 * @Description: 
 */

// Powered by OnSpace.AI
import { LinearGradient } from '../lib/LinearGradient';
import { useRouter } from '../navigation/compat';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppIcon } from '../../components/ui/AppIcon';
import { Text } from '../../components/ui/Text';
import { makeStyles, useTheme } from '../../contexts/ThemeContext';

export default function NotFoundScreen() {
  const t = useTheme();
  const styles = useStyles();
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
        colors={[t.colors.background, t.colors.backgroundSecondary]}
        style={StyleSheet.absoluteFillObject}
      />
      
      <View style={styles.content}>
        <AppIcon name="photo-camera" size={80} color="#FFD700" />
        <Text style={styles.title}>Page Not Found</Text>
        <Text style={styles.message}>
          The moment you're looking for seems to have been lost in the shadows.
        </Text>
        
        <TouchableOpacity 
          style={styles.homeButton}
          onPress={() => router.push('/')}
        >
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
    color: '#CCCCCC',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  homeButton: {
    backgroundColor: '#FFD700',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  homeButtonText: {
    color: '#0a0a0a',
    fontWeight: 'bold',
    fontSize: 16,
  },
}));
