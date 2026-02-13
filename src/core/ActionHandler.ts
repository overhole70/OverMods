
import { useNavigate } from 'react-router-dom';
import { Action } from '../types/sdui';
import { AdService } from './AdService';

export const useActionHandler = () => {
  const navigate = useNavigate();

  const handleAction = async (action?: Action) => {
    if (!action) return;

    console.log("Executing Action:", action);

    switch (action.type) {
      case 'NAVIGATE':
        navigate(`/${action.payload}`);
        break;
      case 'OPEN_URL':
        window.open(action.payload, '_blank');
        break;
      case 'SHOW_TOAST':
        alert(action.payload);
        break;
      case 'SHOW_INTERSTITIAL':
        await AdService.showInterstitial();
        break;
      case 'SHOW_REWARDED':
        await AdService.showRewarded((reward) => {
          console.log("User earned reward:", reward);
          // Here you can navigate to a 'Success' page or update local state
        });
        break;
      case 'SHARE':
        if (navigator.share) {
          navigator.share({ title: 'Check this out', url: action.payload });
        }
        break;
      default:
        console.warn(`Action type ${action.type} not implemented.`);
    }
  };

  return { handleAction };
};
