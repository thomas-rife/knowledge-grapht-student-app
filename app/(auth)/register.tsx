import React, { useState } from 'react'
import { View, StyleSheet, Linking, Alert } from 'react-native'
import { TextInput, Button, Text, HelperText, Menu } from 'react-native-paper'
import { useRouter } from 'expo-router'
import LoadingButton from '@/assets/components/common/LoadingButton'

const Registration = () => {
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [consent, setConsent] = useState<'yes' | 'no' | null>(null)
  const [ageAnswer, setAgeAnswer] = useState<'yes' | 'no' | null>(null)
  const [consentMenuVisible, setConsentMenuVisible] = useState(false)
  const [ageMenuVisible, setAgeMenuVisible] = useState(false)
  const [hasReadConsentDoc, setHasReadConsentDoc] = useState(false)
  const [passwordVisible, setPasswordVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleRegistration = async () => {
    if (isLoading) return
    setIsLoading(true)

    try {
      // Call your backend registration endpoint
      // Your backend should create the Supabase user and store metadata
      const base = process.env.EXPO_PUBLIC_API_BASE_URL || ''
      const url = base.endsWith('/') ? `${base}register` : `${base}/register`

      console.log('Registering at:', url)

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
          displayName,
          consent: ageAnswer === 'yes' ? consent === 'yes' : false,
          isOver18: ageAnswer === 'yes',
        }),
      })

      console.log('Response status:', response.status)
      const data = await response.json()
      console.log('Response data:', data)

      if (!response.ok) {
        Alert.alert('Registration Failed', data.error || 'Registration failed')
        return
      }

      // Registration successful!
      Alert.alert('Success!', 'Your account has been created. Please log in.', [
        {
          text: 'OK',
          onPress: () => router.replace('/(auth)/login'),
        },
      ])
    } catch (err) {
      console.error('Registration error:', err)
      Alert.alert(
        'Error',
        err instanceof Error ? err.message : 'Something went wrong. Please try again.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  const isEmailValid = () => {
    return email.length === 0 || /\S+@\S+\.\S+/.test(email)
  }

  const isPasswordValid = () => {
    return password.length >= 6
  }

  return (
    <View style={styles.surface}>
      <Text style={styles.title}>Create Account</Text>

      <TextInput
        label="Display Name"
        value={displayName}
        onChangeText={text => setDisplayName(text)}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="account" />}
        autoCapitalize="words"
        disabled={isLoading}
      />

      <TextInput
        label="Email"
        value={email}
        onChangeText={text => setEmail(text)}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="email" />}
        keyboardType="email-address"
        autoCapitalize="none"
        error={!isEmailValid()}
        disabled={isLoading}
      />
      <HelperText type="error" visible={!isEmailValid()}>
        Invalid email address
      </HelperText>

      <TextInput
        label="Password"
        value={password}
        onChangeText={text => setPassword(text)}
        mode="outlined"
        style={styles.input}
        left={<TextInput.Icon icon="lock" />}
        right={
          <TextInput.Icon
            icon={passwordVisible ? 'eye-off' : 'eye'}
            onPress={() => setPasswordVisible(!passwordVisible)}
          />
        }
        secureTextEntry={!passwordVisible}
        disabled={isLoading}
      />
      <HelperText type="error" visible={password.length > 0 && !isPasswordValid()}>
        Password must be at least 6 characters long
      </HelperText>

      {/* Age confirmation Yes/No — must answer first */}
      <View style={styles.consentRow}>
        <Menu
          visible={ageMenuVisible}
          onDismiss={() => setAgeMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => !isLoading && setAgeMenuVisible(true)}
              style={styles.dropdown}
              icon={ageMenuVisible ? 'chevron-up' : 'chevron-down'}
              disabled={isLoading}
            >
              {ageAnswer
                ? `18 or older: ${ageAnswer === 'yes' ? 'Yes' : 'No'}`
                : 'Are you 18 or older?'}
            </Button>
          }
        >
          <Menu.Item
            onPress={() => {
              setAgeAnswer('yes')
              setAgeMenuVisible(false)
            }}
            title="Yes"
          />
          <Menu.Item
            onPress={() => {
              setAgeAnswer('no')
              setConsent(null)
              setHasReadConsentDoc(false)
              setAgeMenuVisible(false)
            }}
            title="No"
          />
        </Menu>
      </View>
      <HelperText type={ageAnswer === 'no' ? 'info' : 'info'} visible>
        {ageAnswer === 'no'
          ? 'Under 18 selected.'
          : ageAnswer === 'yes'
          ? '18 or older selected.'
          : 'Please answer Yes or No.'}
      </HelperText>

      {/* Study consent appears only if user is 18 or older */}
      {ageAnswer === 'yes' && (
        <>
          <View style={styles.consentRow}>
            <Button
              mode={hasReadConsentDoc ? 'contained' : 'outlined'}
              onPress={() => {
                if (ageAnswer !== 'yes') return
                Linking.openURL('https://lmu.box.com/s/ovugg7s04upn6tuxa77cswxxc69iri1w')
                setHasReadConsentDoc(true)
              }}
              style={styles.dropdown}
              icon="file-document"
              disabled={ageAnswer !== 'yes' || isLoading}
            >
              {hasReadConsentDoc ? 'Reopen consent document' : 'Read the study consent document'}
            </Button>

            <Menu
              visible={consentMenuVisible}
              onDismiss={() => setConsentMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => hasReadConsentDoc && !isLoading && setConsentMenuVisible(true)}
                  style={styles.dropdown}
                  disabled={!hasReadConsentDoc || isLoading}
                  icon={consentMenuVisible ? 'chevron-up' : 'chevron-down'}
                >
                  {consent ? `Consent: ${consent === 'yes' ? 'Yes' : 'No'}` : 'Select consent'}
                </Button>
              }
            >
              <Menu.Item
                onPress={() => {
                  setConsent('yes')
                  setConsentMenuVisible(false)
                }}
                title="Yes"
              />
              <Menu.Item
                onPress={() => {
                  setConsent('no')
                  setConsentMenuVisible(false)
                }}
                title="No"
              />
            </Menu>
          </View>
          <HelperText type={consent === 'no' ? 'error' : 'info'} visible>
            {hasReadConsentDoc
              ? consent === 'no'
                ? 'You chose not to consent.'
                : 'Please select Yes or No after reviewing the document.'
              : 'Open the consent document before selecting an answer.'}
          </HelperText>
        </>
      )}

      <LoadingButton
        mode="contained"
        onPress={handleRegistration}
        style={styles.button}
        loading={isLoading}
        disabled={
          isLoading ||
          !displayName ||
          !email ||
          !password ||
          !isEmailValid() ||
          !isPasswordValid() ||
          ageAnswer === null ||
          (ageAnswer === 'yes' && (!hasReadConsentDoc || consent === null))
        }
      >
        {isLoading ? 'Creating Account...' : 'Register'}
      </LoadingButton>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Button mode="text" onPress={() => router.replace('./login')} disabled={isLoading}>
          Login
        </Button>
      </View>
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
    marginBottom: 4,
  },
  button: {
    width: '100%',
    marginTop: 16,
    paddingVertical: 6,
  },
  consentRow: {
    width: '100%',
    marginTop: 12,
  },
  dropdown: {
    width: '100%',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {},
})

export default Registration
