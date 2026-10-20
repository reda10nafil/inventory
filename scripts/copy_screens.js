const fs = require('fs');
const path = require('path');

const mappings = [
  ['app/(tabs)/index.tsx', 'src/screens/tabs/HomeScreen.tsx'],
  ['app/(tabs)/timeline.tsx', 'src/screens/tabs/TimelineScreen.tsx'],
  ['app/(tabs)/automations.tsx', 'src/screens/tabs/AutomationsScreen.tsx'],
  ['app/(tabs)/add.tsx', 'src/screens/tabs/AddScreen.tsx'],
  ['app/(tabs)/settings.tsx', 'src/screens/tabs/SettingsScreen.tsx'],
  ['app/scanner.tsx', 'src/screens/ScannerScreen.tsx'],
  ['app/scanner-action.tsx', 'src/screens/ScannerActionScreen.tsx'],
  ['app/product/[id].tsx', 'src/screens/product/DetailScreen.tsx'],
  ['app/product/edit/[id].tsx', 'src/screens/product/EditScreen.tsx'],
  ['app/+not-found.tsx', 'src/screens/NotFoundScreen.tsx'],
  ['app/settings/locations.tsx', 'src/screens/settings/LocationsScreen.tsx'],
  ['app/settings/fields.tsx', 'src/screens/settings/FieldsScreen.tsx'],
  ['app/settings/folders.tsx', 'src/screens/settings/FoldersScreen.tsx'],
  ['app/settings/layout-builder.tsx', 'src/screens/settings/LayoutBuilderScreen.tsx'],
  ['app/settings/gs1-config.tsx', 'src/screens/settings/Gs1ConfigScreen.tsx'],
  ['app/settings/hardware.tsx', 'src/screens/settings/HardwareScreen.tsx'],
  ['app/settings/trash.tsx', 'src/screens/settings/TrashScreen.tsx'],
  ['app/settings/share.tsx', 'src/screens/settings/ShareScreen.tsx'],
  ['app/settings/sector-templates.tsx', 'src/screens/settings/SectorTemplatesScreen.tsx'],
  ['app/settings/automation-builder.tsx', 'src/screens/settings/AutomationBuilderScreen.tsx'],
  ['app/automations/automation-flow.tsx', 'src/screens/automations/AutomationFlowScreen.tsx'],
  ['app/automations/custom-runner.tsx', 'src/screens/automations/CustomRunnerScreen.tsx'],
  ['app/automations/audit.tsx', 'src/screens/automations/AuditScreen.tsx'],
  ['app/automations/batch-move.tsx', 'src/screens/automations/BatchMoveScreen.tsx'],
  ['app/automations/scan-sell.tsx', 'src/screens/automations/ScanSellScreen.tsx'],
  ['app/automations/quick-tag.tsx', 'src/screens/automations/QuickTagScreen.tsx'],
];

function ensureDir(p) {
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

for (const [src, dest] of mappings) {
  const srcPath = path.join(__dirname, '..', src);
  const destPath = path.join(__dirname, '..', dest);
  if (!fs.existsSync(srcPath)) {
    console.log('SKIP missing', src);
    continue;
  }
  let content = fs.readFileSync(srcPath, 'utf8');
  // Replace expo-router imports with compat
  content = content.replace(/from\s+['"]expo-router['"]/g, "from '../navigation/compat'");
  content = content.replace(/from\s+['"]expo-router\/.*['"]/g, "from '../navigation/compat'");
  // Fix relative paths: app files use ../../constants etc. From src/screens/* depth differs.
  // Mappings adjust: app/(tabs)/index depth 2 -> src/screens/tabs depth 2, same relative? ../../ still works? 
  // But need to ensure imports like '../../constants/theme' from src/screens/tabs/* should be '../../constants/theme' as well? app/(tabs) is 1 level deep from root? src/screens/tabs also 2 levels from root? Actually app/(tabs)/index is at app/(tabs)/, src/screens/tabs is also 2 deep, so ../../ still goes to root? Let's check:
  // app/(tabs)/index: ../../constants -> inventory/constants correct.
  // src/screens/tabs/Home: ../../constants -> inventory/constants? src/screens/tabs is at src/screens/tabs, ../../ is inventory/src? Wait src/screens/tabs -> ../../ is inventory/src? That's not correct. Need to adjust.
  // For src/screens/tabs, to reach inventory/constants, need ../../..? Let's compute:
  // src/screens/tabs/HomeScreen.tsx -> path: inventory/src/screens/tabs/HomeScreen.tsx
  // To get to inventory/constants/theme.ts: need '../../../constants/theme' (up 3: tabs->screens->src->root)
  // Original app/(tabs)/index: app/(tabs)/index -> ../../ is inventory/ (up 2: (tabs)->app->root) so '../../constants' is correct.
  // So for src/screens/tabs, we need to replace '../../' with '../../../' for those imports.
  // General rule: replace '../../' with '../../../' for files under src/screens/tabs and src/screens/settings etc? Let's handle per dest depth.

  // Simple fix: replace '../../constants' with '../../../constants', '../../contexts' with '../../../contexts', '../../components' etc.
  // For src/screens/product (depth 3: src/screens/product), need '../../../' as well? Actually src/screens/product is also 3 deep (src->screens->product), so also '../../../'.
  // For src/screens/*.tsx direct (src/screens/ScannerScreen) depth 2: src/screens -> need '../../' to reach root? Wait src/screens/ScannerScreen is at src/screens/, so '../../' would be? Let's compute: src/screens/ScannerScreen.tsx -> ../.. is inventory/src? No inventory/src/screens -> ../../ is inventory/ ? Actually src/screens is 2 deep: inventory/src/screens -> up 2 is inventory/. So '../../constants' from src/screens/ScannerScreen would be correct (same as app). So only tabs, product, settings, automations subfolders need extra ../

  // We'll apply heuristic: if dest includes '/', replace appropriately.

  // For now, do targeted replaces for known prefixes:
  content = content.replace(/from\s+['"]\.\.\/\.\.\/constants\//g, "from '../../../constants/");
  content = content.replace(/from\s+['"]\.\.\/\.\.\/contexts\//g, "from '../../../contexts/");
  content = content.replace(/from\s+['"]\.\.\/\.\.\/components\//g, "from '../../../components/");
  content = content.replace(/from\s+['"]\.\.\/\.\.\/services\//g, "from '../../../services/");
  content = content.replace(/from\s+['"]\.\.\/\.\.\/utils\//g, "from '../../../utils/");
  content = content.replace(/from\s+['"]\.\.\/\.\.\/types\//g, "from '../../../types/");
  content = content.replace(/from\s+['"]\.\.\/contexts\//g, "from '../../contexts/"); // for direct src/screens files

  // For direct src/screens files (Scanner etc), they originally had '../../' but should remain '../../' (since depth 2 same as app). However our previous replace changed them to '../../../' incorrectly. So revert for those:
  // We'll handle by checking dest depth: if dest is src/screens/*.tsx (no subfolder), then we should not have ../../../, keep '../../'
  // The replacements above for '../../' -> '../../../' will overdo for those. So for dest without sub-subfolder, revert.

  const depth = dest.split('/').length - 1; // src/screens/tabs/Home: 3
  if (dest.split('/').length === 3) { // src/screens/ScannerScreen.tsx depth 2? Actually src/screens/ScannerScreen -> parts: src, screens, file = 3, same as tabs? Hmm both 3? Let's differentiate: src/screens/ScannerScreen has 2 folders (src, screens) vs src/screens/tabs/Home has 3 folders.
    // For direct src/screens files, we need ../../ not ../../../
    // Our replacements made them ../../../, so revert one level:
    if (dest.startsWith('src/screens/') && dest.split('/').length === 3) {
      content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/constants\//g, "from '../../constants/");
      content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/contexts\//g, "from '../../contexts/");
      content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/components\//g, "from '../../components/");
      content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/services\//g, "from '../../services/");
      content = content.replace(/from\s+['"]\.\.\/\.\.\/\.\.\/utils\//g, "from '../../utils/");
    }
  }

  // Also need to fix href pushes? Keep original string, compat will handle.

  ensureDir(destPath);
  fs.writeFileSync(destPath, content, 'utf8');
  console.log('copied', src, '->', dest);
}
