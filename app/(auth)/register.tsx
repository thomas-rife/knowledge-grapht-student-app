import React, { useState } from 'react'
import { View, StyleSheet, Linking } from 'react-native'
import { TextInput, Button, Text, HelperText, Menu } from 'react-native-paper'
import { useRouter } from 'expo-router'

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
  const router = useRouter()

  /**
   * @TODO Work with Diego to implement registration functionality
   */
  const handleRegistration = async () => {
    try {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          displayName,
          consent: ageAnswer === 'yes' ? consent === 'yes' : false,
          isOver18: ageAnswer === 'yes',
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        alert(data.error || 'Registration failed')
        return
      }

      alert('Registration successful!')
      // maybe navigate to login or classes
      router.replace('../login')
    } catch (err) {
      console.error('Registration error:', err)
      alert('Something went wrong. Please try again.')
    }
  }

  const isEmailValid = () => {
    return email.length === 0 || /\S+@\S+\.\S+/.test(email)
  }

  /**
   * @TODO Check if SafeAreaView wrapper is necessary
   * @TODO Refactor to correctly use React Native Paper Components (Title)
   */
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
      />
      <HelperText type="info">Password must be at least 6 characters long</HelperText>

      {/* Age confirmation Yes/No — must answer first */}
      <View style={styles.consentRow}>
        <Menu
          visible={ageMenuVisible}
          onDismiss={() => setAgeMenuVisible(false)}
          anchor={
            <Button
              mode="outlined"
              onPress={() => setAgeMenuVisible(true)}
              style={styles.dropdown}
              icon={ageMenuVisible ? 'chevron-up' : 'chevron-down'}
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
      <HelperText type={ageAnswer === 'no' ? 'warning' : 'info'} visible>
        {ageAnswer === 'no' ? 'Under 18 selected.' : 'Please answer Yes or No.'}
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
              disabled={ageAnswer !== 'yes'}
            >
              {hasReadConsentDoc ? 'Reopen consent document' : 'Read the study consent document'}
            </Button>

            <Menu
              visible={consentMenuVisible}
              onDismiss={() => setConsentMenuVisible(false)}
              anchor={
                <Button
                  mode="outlined"
                  onPress={() => hasReadConsentDoc && setConsentMenuVisible(true)}
                  style={styles.dropdown}
                  disabled={!hasReadConsentDoc}
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

      <Button
        mode="contained"
        onPress={handleRegistration}
        style={styles.button}
        disabled={
          !displayName ||
          !email ||
          !password ||
          !isEmailValid() ||
          ageAnswer === null ||
          // If 18+, must read doc and answer consent; if under 18, skip consent entirely
          (ageAnswer === 'yes' && (!hasReadConsentDoc || consent === null))
        }
      >
        Register
      </Button>

      <View style={styles.footer}>
        <Text style={styles.footerText}>Already have an account?</Text>
        <Button mode="text" onPress={() => router.replace(`./login`)}>
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
  link: {
    marginTop: 8,
    textDecorationLine: 'underline',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
  },
  footerText: {},
  // checkboxRow and checkboxButton removed (no longer used)
})

export default Registration
