import React, {
  createContext,
  useReducer,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import {User, UserState, Unit} from "../types";

import {login, logout, getUser} from "../services/user.service";

interface UserAction {
  type: "LOGIN";
  payload?: {username: string; password: string};
}
interface LogoutAction {
  type: "LOGOUT";
}
interface InitializeAction {
  type: "INITIALIZE";
  payload: UserState;
}

type actions = UserAction | InitializeAction | LogoutAction;
const UserContext = createContext<
  {state: UserState; dispatch: React.Dispatch<actions>} | undefined
>(undefined);

function userReducer(state: UserState, action: actions): UserState {
  switch (action.type) {
    case "INITIALIZE":
      return {
        ...action.payload,
        user: action.payload.user,
        login: true,
      };
    case "LOGOUT":
      return {
        ...state,
        login: false,
        user: {} as User,
        access_token: undefined,
      };

    default:
      return state;
  }
}

function UserProvider({children}: {children: ReactNode}) {
  const initialState: UserState = {
    login: false,
    user: undefined,
  };

  const [state, baseDispatch] = useReducer(userReducer, initialState);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = await getUser();
        if (user) {
          baseDispatch({type: "INITIALIZE", payload: user});
        }
      } catch (err) {
        console.log(err);
      }
    };
    fetchUser();
  }, []);

  const serviceDispatch = async (action: actions) => {
    switch (action.type) {
      case "LOGOUT":
        logout();
        baseDispatch(action);
        break;

      default:
        baseDispatch(action);
    }
  };

  return (
    <UserContext.Provider value={{state, dispatch: serviceDispatch}}>
      {children}
    </UserContext.Provider>
  );
}

export default UserProvider;

export function useUserState() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserState must be used within a UserProvider");
  }
  return context.state;
}
export function useUserDispatch() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error("useUserDispatch must be used within a UserProvider");
  }
  return context.dispatch;
}
