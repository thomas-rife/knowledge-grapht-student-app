import React, { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text, Avatar, Card, Title, Paragraph, Button, IconButton } from 'react-native-paper'
import { View, StyleSheet, Alert } from 'react-native'
import * as ImagePicker from 'expo-image-picker'
import { useRouter } from 'expo-router'

const ProfileScreen = () => {
  const [image, setImage] = useState('')
  const [userID, setUserID] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showLogoutAlert, setShowLogoutAlert] = useState(false)
  const router = useRouter()

  const handleSignOut = async () => {
    setShowLogoutAlert(true)
  }

  const handleLogout = async () => {
    try {
      setIsLoading(true)

      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}logout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (response.ok) {
        router.replace('/')
      } else {
        Alert.alert('Logout Failed', 'OK')
      }
    } catch (error) {
      Alert.alert('Network Error', 'OK')
    } finally {
      setIsLoading(false)
      setShowLogoutAlert(false)
    }
  }

  useEffect(() => {
    const fetchProfile = async () => {
      const response = await fetch(`${process.env.EXPO_PUBLIC_API_BASE_URL}user/account-info`)
      if (response.ok) {
        const data = await response.json()

        setUserID(data.userID)
        setEmail(data.email)
        setDisplayName(data.displayName || '')
      } else if (response.status === 401) {
        router.replace(`/(auth)/login`)
      }
    }
    fetchProfile()
  }, [])

  const pickImage = async () => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    })

    if (!result.canceled) {
      setImage(result.assets[0].uri)
    }
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <Card style={{ marginHorizontal: 0, padding: 10, width: '100%' }}>
        <Card.Content style={{ alignItems: 'center' }}>
          <View style={styles.avatarContainer}>
            <Avatar.Image
              size={100}
              source={image ? { uri: image } : require('../../../assets/images/KGLogo.png')}
            />
            <IconButton icon="pencil" size={24} onPress={pickImage} style={styles.editIcon} />
          </View>
          <Title style={{ marginTop: 10, textAlign: 'center' }}>{displayName || userID}</Title>
          <Paragraph style={{ textAlign: 'center' }}>Email: {email}</Paragraph>
          <Button
            mode="contained"
            onPress={handleSignOut}
            loading={isLoading}
            disabled={isLoading}
            style={{ marginTop: 10, width: 200 }}
          >
            {isLoading ? 'Signing Out...' : 'Sign Out'}
          </Button>
        </Card.Content>
      </Card>
      {showLogoutAlert && (
        <View
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <View style={{ padding: 20, borderRadius: 10 }}>
            <Text style={{ marginBottom: 10 }}>Are you sure you want to log out?</Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
              <Button mode="contained" onPress={handleLogout} style={{ marginRight: 10 }}>
                Yes
              </Button>
              <Button
                mode="contained"
                onPress={() => setShowLogoutAlert(false)}
                style={{ marginLeft: 10 }}
              >
                No
              </Button>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  avatarContainer: {
    alignItems: 'center',
    marginBottom: 10,
    position: 'relative',
  },
  editIcon: {
    position: 'absolute',
    top: 0,
    right: 0,
    // backgroundColor: 'white',
  },
})

export default ProfileScreen
