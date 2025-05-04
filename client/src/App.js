// App Componenet
// Handles the main rendering of the application and overall structure of the UI
// TODO: Remove default created react app logic

//import logo from './logo.svg';
import './App.css';
//import axios from 'axios';
import DateInput from './components/DateInput';
import MetricCard from './components/MetricCard';

import {exampleMetricCardDetails} from './ExampleMetricCardData';
import SaveDataButton from './components/SaveDataButton';
import AddMetricCard from './components/AddMetricCard';

import AppBar from '@mui/material/AppBar';

import * as api from './api';
import MetricsList from './components/MetricsList';

import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Layout } from './Layout'
import { Home } from './pages/Home'
import { Edit } from './pages/Edit'
import { Visualize } from './pages/Visualize'

// TESTING WITH NEW ROUTING
function App() {
  return (
    <div className="App">
      <header className='App-header'>
    
        <Router>
          <Routes>
            <Route element={<Layout/>}>
              <Route path="/" element={<Home />} />
              <Route path="/edit" element={<Edit />} />
              <Route path="/visualize" element={<Visualize />} />
            </Route>
          </Routes>
        </Router>
      </header>
    </div>
  );
}


/*

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <AppBar position="static" color="#333">
          Welcome to Life Log
        </AppBar>

        <DateInput />

        {/* Display each metric card */ /*}
        {exampleMetricCardDetails.map(cardDetail => <MetricCard key={cardDetail.id} id={cardDetail.id} title={cardDetail.title} inputType={cardDetail.inputType}/>)}

        <SaveDataButton />

        <button onClick={api.fetchMetrics}>Load Metrics</button>
      
        <MetricsList />

        <AddMetricCard onClick={api.addMetric}/>
      </header>

      <footer>
      <p>LifeLog v0.1</p>
    </footer>
      
    </div>
  );
}*/

export default App;
