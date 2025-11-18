import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper'
import { DefaultTheme as nativeLight, DarkTheme as nativeDark } from '@react-navigation/native'
import merge from 'deepmerge'
import { Colors } from './Colors'

const paperLight = { ...MD3LightTheme, colors: Colors.light }
const paperDark = { ...MD3DarkTheme, colors: Colors.dark }

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  reactNavigationLight: nativeLight,
  reactNavigationDark: nativeDark,
})

const fullLight = merge(LightTheme, paperLight)
const fullDark = merge(DarkTheme, paperDark)

/**
 * The dark and light themes used by the app.
 *
 * @see Colors for instructions to change the color theme.
 */
export const Themes = { light: fullLight, dark: fullDark }
