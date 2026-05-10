// Centralized state management
export const state = {
    isPredicting: false,
    results: null,
    currentTab: 'mean',
    theme: 'dark'
};

export const setPredicting = (status) => {
    state.isPredicting = status;
};

export const setResults = (data) => {
    state.results = data;
};
