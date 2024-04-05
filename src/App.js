import {
  Box,
  Button,
  ButtonGroup,
  Flex,
  HStack,
  IconButton,
  Input,
  SkeletonText,
  Text,
} from '@chakra-ui/react'
import { FaLocationArrow, FaTimes } from 'react-icons/fa'

import axios from 'axios'; // To make API requests


import {
  useJsApiLoader,
  GoogleMap,
  Marker,
  Autocomplete,
  DirectionsRenderer,
} from '@react-google-maps/api'
import { useRef, useState, useEffect } from 'react'

function App() {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY,
    libraries: ['places'],
  })

  const [map, setMap] = useState(/** @type google.maps.Map */ (null))
  const [directionsResponse, setDirectionsResponse] = useState(null)
  const [distance, setDistance] = useState('')
  const [duration, setDuration] = useState('')
  const [directions, setDirections] = useState([])
  const [currentWeather, setCurrentWeather] = useState(null)
  const [instructionsVisible, setInstructionsVisible] = useState(true);
  const toggleInstructionsVisibility = () => {
    setInstructionsVisible(!instructionsVisible);
  };
  

  /** @type React.MutableRefObject<HTMLInputElement> */
  const originRef = useRef()
  /** @type React.MutableRefObject<HTMLInputElement> */
  const destinationRef = useRef()

  if (!isLoaded) {
    return <SkeletonText />
  }

  async function calculateRoute() {
    if (originRef.current.value === '' || destinationRef.current.value === '') {
      return
    }

    if (window.google) {
      const directionsService = new window.google.maps.DirectionsService()
      const results = await directionsService.route({
        origin: originRef.current.value,
        destination: destinationRef.current.value,
        provideRouteAlternatives: true,
        travelMode: window.google.maps.TravelMode.DRIVING,
      })

      setDirectionsResponse(results)
      setDistance(results.routes[0].legs[0].distance.text)
      setDuration(results.routes[0].legs[0].duration.text)

      const turnByTurnInstructions = getTurnByTurnInstructions(results)
      setDirections(turnByTurnInstructions)

      // Fetch weather data for the origin location
      const originLocation = await getLatLngFromAddress(originRef.current.value)
      fetchWeatherData(originLocation)
    } else {
      console.error('Google Maps API is not loaded.')
    }
  }

  async function getLatLngFromAddress(address) {
    if (window.google) {
      const geocoder = new window.google.maps.Geocoder()
      const response = await geocoder.geocode({ address })
      const location = response.results[0].geometry.location
      return location
    } else {
      console.error('Google Maps API is not loaded.')
      return null
    }
  }

  async function fetchWeatherData(location) {
    if (location) {
      const lat = location.lat()
      const lng = location.lng()
      const apiKey = 'c33f1e3c3e8e34f4848af33c1e58b4c0'
      const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lng}&appid=${apiKey}&units=metric`

      try {
        const response = await axios.get(url)
        const weather = response.data.weather[0].main
        const temp = Math.round(response.data.main.temp)
        setCurrentWeather(`${weather}, ${temp}°C`)
      } catch (error) {
        console.error('Error fetching weather data:', error)
      }
    }
  }

  function getTurnByTurnInstructions(directionsResponse) {
    const instructions = []
    const legs = directionsResponse.routes[0].legs
    for (const leg of legs) {
      for (const step of leg.steps) {
        instructions.push(step.instructions)
      }
    }
    return instructions
  }

  function clearRoute() {
    setDirectionsResponse(null)
    setDistance('')
    setDuration('')
    originRef.current.value = ''
    destinationRef.current.value = ''
    setDirections([])
    setCurrentWeather(null)
  }

  const center = { lat: 48.8584, lng: 2.2945 }

  return (
    <Flex
      position='relative'
      flexDirection='column'
      alignItems='center'
      h='100vh'
      w='100vw'
    >
      <Box position='absolute' left={0} top={0} h='100%' w='100%'>
        {/* Google Map Box */}
        <GoogleMap
          center={center}
          zoom={15}
          mapContainerStyle={{ width: '100%', height: '100%' }}
          options={{
            zoomControl: false,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
          }}
          onLoad={map => setMap(map)}
        >
          <Marker position={center} />
          {directionsResponse && (
            <DirectionsRenderer directions={directionsResponse} />
          )}
        </GoogleMap>
      </Box>
      <Box
        p={4}
        borderRadius='lg'
        m={4}
        bgColor='white'
        shadow='base'
        minW='container.md'
        zIndex='1'
      >
        <HStack spacing={2} justifyContent='space-between'>
          <Box flexGrow={1}>
            <Autocomplete>
              <Input type='text' placeholder='Origin' ref={originRef} />
            </Autocomplete>
          </Box>
          <Box flexGrow={1}>
            <Autocomplete>
              <Input
                type='text'
                placeholder='Destination'
                ref={destinationRef}
              />
            </Autocomplete>
          </Box>

          <ButtonGroup>
            <Button colorScheme='pink' type='submit' onClick={calculateRoute}>
              Calculate Route
            </Button>
            <IconButton
              aria-label='center back'
              icon={<FaTimes />}
              onClick={clearRoute}
            />
          </ButtonGroup>
        </HStack>
        <HStack spacing={4} mt={4} justifyContent='space-between'>
          <Text>Distance: {distance} </Text>
          <Text>Duration: {duration} </Text>
          <IconButton
            aria-label='center back'
            icon={<FaLocationArrow />}
            isRound
            onClick={() => {
              map.panTo(center)
              map.setZoom(15)
            }}
          />
        </HStack>

        
      {/* Display Turn-by-Turn Directions */}
      {instructionsVisible && directions.length > 0 && (
        <Box mt={4} bgColor="gray.100" p={4} borderRadius="md" maxHeight="300px" overflowY="auto">
          <Text fontSize="lg" fontWeight="bold" mb={2}>Turn-by-Turn Directions:</Text>
          <ol style={{ listStyleType: 'decimal', paddingLeft: '20px', margin: '0' }}>
            {directions.map((instruction, index) => (
              <li key={index} style={{ marginBottom: '8px' }}>{instruction.replace(/<[^>]*>?/gm, '')}</li>
            ))}
          </ol>
        </Box>
      )}

      {/* Button to toggle visibility of instructions box */}
      <Button
        mt={2}
        onClick={toggleInstructionsVisibility}
      >
        {instructionsVisible ? 'Hide Instructions' : 'Show Instructions'}
      </Button>
        {/* Weather box outside the main box */}
        {currentWeather && (
          <Box
            position='absolute'
            bottom='30px'
            right='700px'
            zIndex='2'
            bgColor='white'
            p={2}
            borderRadius='lg'
            shadow='base'
          >
            <Text fontWeight='bold'>Current Weather:</Text>
            <Text>
              Weather:
              {currentWeather.split(',')[0]}  {/* Display weather description */}
              <br />  {/* Add a line break */}
              <Text fontSize='sm' color='gray.500'> Temperature: {/* Style temperature text smaller and gray */}
                {currentWeather.split(',')[1]}  {/* Display temperature */}
              </Text>
            </Text>
          </Box>
        )}
      </Box>

    </Flex>
  )
}

export default App


