import React from 'react';
import {createRoot} from 'react-dom/client';
import {AppErrorBoundary} from '../error-boundary.jsx';

function BrokenPage(){throw new Error('intentional test render failure')}

const fixture=document.createElement('div');
fixture.id='error-boundary-fixture';
document.body.append(fixture);
createRoot(fixture).render(<AppErrorBoundary><BrokenPage/></AppErrorBoundary>);
