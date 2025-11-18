import React, { ReactNode } from 'react'
import Icon from 'react-native-vector-icons/MaterialCommunityIcons'

/**
 * Returns a function that renders a particular icon based on the focused state.
 * tabBarIcon requires a function that returns a React component, NOT the component itself.
 *
 * @see https://static.enapter.com/rn/icons/material-community.html to ensure the selected icon has
 *  an "-outline" variant.
 *
 * @requires react-native-vector-icons/MaterialCommunityIcons
 * @param icon - string name of icon to use (must have an "-outline" variant).
 * @returns A function that takes focused, color, and size as parameters and returns an Icon component. This function is NOT to be filled in by the user.
 */
export default function TabIcon(
  icon: string
): (props: { focused: boolean; color: string; size: number }) => ReactNode {
  return ({ focused, color, size }: { focused: boolean; color: string; size: number }) => {
    return <Icon name={focused ? `${icon}` : `${icon}-outline`} size={size || 24} color={color} />
  }
}
