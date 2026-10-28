import { MD3LightTheme, MD3DarkTheme, adaptNavigationTheme } from 'react-native-paper'
import {
  DefaultTheme as nativeLight,
  DarkTheme as nativeDark,
} from 'expo-router/react-navigation'
import merge from 'deepmerge'
import { Colors } from './Colors'

type PaperNavigationTheme = {
  dark: boolean
  colors: {
    primary: string
    background: string
    card: string
    text: string
    border: string
    notification: string
  }
}

const paperLight = { ...MD3LightTheme, colors: Colors.light }
const paperDark = { ...MD3DarkTheme, colors: Colors.dark }

const { LightTheme, DarkTheme } = adaptNavigationTheme({
  // Expo Router widens these built-in string colors to React Native's ColorValue.
  reactNavigationLight: nativeLight as unknown as PaperNavigationTheme,
  reactNavigationDark: nativeDark as unknown as PaperNavigationTheme,
})

const fullLight = merge(LightTheme, paperLight)
const fullDark = merge(DarkTheme, paperDark)

/**
 * The dark and light themes used by the app.
 *
 * @see Colors for instructions to change the color theme.
 */
export const Themes = { light: fullLight, dark: fullDark }
