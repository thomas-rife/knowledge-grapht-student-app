import React, { useState } from 'react'
import { View, StyleSheet } from 'react-native'
import { TextInput, Button, Text, ActivityIndicator } from 'react-native-paper'
import { useRouter } from 'expo-router'
import { supabase } from '@/supabaseClient' // Add this line

const Login = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loggingIn, setLoggingIn] = useState(false)

  const router = useRouter()

  const handleLogin = async () => {
    if (!email || !password) {
      alert('Please provide an email and password')
      return
    }

    setLoggingIn(true) // Set loading FIRST

    try {
      const trimmedEmail = email.trim()

      // Only ONE fetch call with the correct URL
      const loginResponse = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: trimmedEmail, password }),
      })

      if (loginResponse.ok) {
        const data = await loginResponse.json()

        // Set the session in Supabase client
        if (data.session) {
          await supabase.auth.setSession({
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          })
        }

        router.replace('../classes')
      } else {
        const data = await loginResponse.json()
        alert(data.error || 'Login failed')
      }
    } catch (error) {
      console.error('Login error:', error)
      alert('Network error. Please try again.')
    } finally {
      setLoggingIn(false)
    }
  }

  return (
    <View style={styles.surface}>
      <Text style={styles.title}>Welcome Back</Text>
      <TextInput
        label="Email"
        value={email}
        onChangeText={text => setEmail(text)}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="email" />}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <TextInput
        label="Password"
        value={password}
        onChangeText={text => setPassword(text)}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="lock" />}
        secureTextEntry
      />
      <Button
        mode="contained"
        onPress={handleLogin}
        style={styles.button}
        loading={loggingIn}
        disabled={loggingIn}
      >
        Login
      </Button>
      <View style={styles.footer}>
        <Text style={styles.footerText}>Don't have an account?</Text>
        <Button mode="text" onPress={() => router.replace(`./register`)}>
          Sign Up
        </Button>
      </View>

      {/* DEBUG ONLY */}
      {/* <View style={{ opacity: 1 }}>
        <Button style={{ backgroundColor: 'red' }} onPress={() => router.push('../classes')}>
          <Text style={{ fontWeight: 'bold' }}>DEV BUTTON:</Text> To Class Screen
        </Button>
      </View> */}
    </View>
  )
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    padding: 20,
    margin: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    marginBottom: 24,
    fontWeight: 'bold',
  },
  input: {
    width: '100%',
    marginBottom: 16,
  },
  button: {
    width: '100%',
    marginTop: 8,
    paddingVertical: 6,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
  },
  footerText: {},
})

export default Login
