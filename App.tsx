import {SafeAreaProvider} from 'react-native-safe-area-context';
import {GestureHandlerRootView} from 'react-native-gesture-handler';
import {NavigationContainer} from '@react-navigation/native';
import {createStackNavigator} from '@react-navigation/stack';
import HomeScreen from './src/screens/HomeScreen';
import SettingsScreen from './src/screens/SettingsScreen';

export type RootStackParamList = {
  Home: undefined;
  Settings: undefined;
};

const Stack = createStackNavigator<RootStackParamList>();

function App() {
  return (
    <SafeAreaProvider>
      <GestureHandlerRootView style={{flex: 1}}>
        <NavigationContainer>
          <Stack.Navigator
            initialRouteName="Home"
            screenOptions={{
              headerStyle: {backgroundColor: '#c75d2c'},
              headerTintColor: '#fff8ef',
              headerTitleStyle: {fontWeight: '700'},
            }}>
            <Stack.Screen
              name="Home"
              component={HomeScreen}
              options={{title: 'MiMo TTS 测试台'}}
            />
            <Stack.Screen
              name="Settings"
              component={SettingsScreen}
              options={{title: '请求配置'}}
            />
          </Stack.Navigator>
        </NavigationContainer>
      </GestureHandlerRootView>
    </SafeAreaProvider>
  );
}

export default App;
