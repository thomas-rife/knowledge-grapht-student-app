import React from 'react'
import { StyleSheet } from 'react-native'
import { useTheme } from 'react-native-paper'
import Svg, { Path as SvgPath } from 'react-native-svg'

interface EdgeProps {
  start: { x: number; y: number }
  end: { x: number; y: number }
}

const strokeWidth = 3

const Path = ({ start, end }: EdgeProps) => {
  const theme = useTheme()

  // Calculate control points for Bezier curve
  const dx = end.x - start.x
  const dy = end.y - start.y

  // Control point offset - this creates the curve
  const offset = Math.sqrt(dx * dx + dy * dy) * 0.25

  // Calculate control points for a smooth curve
  const cp1x = start.x + dx * 0.25
  const cp1y = start.y + dy * 0.25 + offset
  const cp2x = start.x + dx * 0.75
  const cp2y = start.y + dy * 0.75 - offset

  // Create SVG path string for cubic Bezier curve
  const pathData = `M ${start.x} ${start.y} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${end.x} ${end.y}`

  // Calculate bounding box for the SVG
  const minX = Math.min(start.x, end.x, cp1x, cp2x) - 10
  const minY = Math.min(start.y, end.y, cp1y, cp2y) - 10
  const maxX = Math.max(start.x, end.x, cp1x, cp2x) + 10
  const maxY = Math.max(start.y, end.y, cp1y, cp2y) + 10
  const width = maxX - minX
  const height = maxY - minY

  return (
    <Svg
      style={[
        StyleSheet.absoluteFill,
        {
          left: minX,
          top: minY,
          width,
          height,
        },
      ]}
      viewBox={`${minX} ${minY} ${width} ${height}`}
    >
      <SvgPath
        d={pathData}
        stroke={theme.colors.outline}
        strokeWidth={strokeWidth}
        fill="none"
        strokeLinecap="round"
      />
    </Svg>
  )
}

export default Path
