import React, {
  ReactNode,
  createContext,
  useContext,
  useReducer,
  useEffect,
  useState,
} from "react";
import Highlighter from "web-highlighter";
import HighlightSource from "web-highlighter/dist/model/source";
import AnnotationService from "../services/annotation.service";
import {RenderPop} from "../components/Toolbar";
import {
  Annotation,
  AnnotationTag,
  SideBarAction,
  AnnotationData,
  Feedback,
} from "../types";
import {createPortal} from "react-dom";
import Tippy from "@tippyjs/react";

interface HighlightState {
  highlighterLib: Highlighter | null;
  feedbackId?: number;
  records: AnnotationData[];
  isHighlighting: boolean;
  editing: {
    sidebarAction: SideBarAction;
    annotation: Annotation;
  } | null;
  drafting: HighlightSource | null;
}
interface InitializeAction {
  type: "INITIALIZE";
  payload: Feedback | null;
}

interface AddFeedbackAction {
  type: "ADD_FEEDBACK";
  payload: Feedback;
}
interface AddRecordAction {
  type: "ADD_RECORD";
  payload: AnnotationData;
}

interface SetEditingAction {
  type: "SET_EDITING";
  payload: {sidebarAction: SideBarAction; annotation: Annotation};
}

interface SetIsHighlightingAction {
  type: "SET_IS_HIGHLIGHTING";
  payload: boolean;
}

interface DeleteRecordAction {
  type: "DELETE_RECORD";
  payload: {
    id: string; // Or number, based on your ID type.
  };
}
interface SetDraftingAction {
  type: "SET_DRAFTING";
  payload: HighlightSource;
}
interface SelectHighlightAction {
  type: "SELECT_HIGHLIGHT";
  payload: string;
}

type Action =
  | AddRecordAction
  | SetEditingAction
  | SetIsHighlightingAction
  | DeleteRecordAction
  | InitializeAction
  | SetDraftingAction
  | AddFeedbackAction
  | SelectHighlightAction;
const HighlighterContext = createContext<
  {state: HighlightState; dispatch: React.Dispatch<Action>} | undefined
>(undefined);

const highlighterReducer = (
  state: HighlightState,
  action: Action
): HighlightState => {
  switch (action.type) {
    case "INITIALIZE":
      const root = document.getElementById("docos-stream-view") as HTMLElement;
      root
        ? console.log("doco streamview")
        : console.log("not doco streamview");
      const lib = new Highlighter({
        $root: root ? root : document.documentElement,
        exceptSelectors: ["#react-root"],
      });

      const initialState: HighlightState = {
        highlighterLib: lib,
        records: action.payload?.highlights ? action.payload.highlights : [],
        editing: null,
        isHighlighting: false,
        feedbackId: action.payload?.id,
        drafting: null,
      };

      const feedback = action.payload;
      const records = feedback?.highlights?.map((highlight) => {
        lib.fromStore(
          highlight.annotation.startMeta,
          highlight.annotation.endMeta,
          highlight.annotation.id,
          highlight.annotation.text
        );
      });
      console.log("initialize");

      return {...state, ...initialState};
    case "SET_DRAFTING":
      return {...state, drafting: action.payload};
    case "ADD_RECORD":
      //after adding record to db, add to state and remove from current editing and drafting
      return {
        ...state,
        editing: null,
        drafting: null,
        records: [...state.records, action.payload],
      };
    case "SET_EDITING":
      console.log(action.payload);
      return {...state, editing: action.payload};
    case "SET_IS_HIGHLIGHTING":
      action.payload
        ? state.highlighterLib?.run()
        : state.highlighterLib?.stop();
      return {...state, isHighlighting: action.payload};
    case "DELETE_RECORD":
      const newRecords = state.records.filter(
        (record) => record.annotation.id !== action.payload.id
      );
      state.highlighterLib?.remove(action.payload.id);
      return {...state, records: newRecords};
    case "ADD_FEEDBACK":
      return {...state, feedbackId: action.payload.id};
    case "SELECT_HIGHLIGHT":
      const highlight = state.records.find(
        (record) => record.annotation.id === action.payload
      );
      if (!highlight) {
        return state;
      }
      return {
        ...state,
        editing: {sidebarAction: "Notes", annotation: highlight.annotation},
      };

    default:
      return state;
  }
};

export const HighlighterProvider = ({children}: {children: ReactNode}) => {
  const [state, baseDispatch] = useReducer(highlighterReducer, {
    highlighterLib: null,
    records: [],
    editing: null,
    isHighlighting: false,
    drafting: null,
  });
  const [selectedHighlightElement, setSelectedHighlightElement] =
    useState<HTMLElement | null>(null);
  const [selectedHighlighId, setSelectedHighlightId] = useState<string | null>(
    null
  );
  const service = new AnnotationService();

  const dispatch = async (action: Action) => {
    switch (action.type) {
      case "ADD_RECORD":
        try {
          const sources = action.payload;
          console.log(action.payload);
          if (state.feedbackId) {
            const annotation = await service.addAnnotations(sources);
          } else {
          }
          baseDispatch({type: "ADD_RECORD", payload: action.payload});
        } catch (err) {
          console.log(err);
        }
        break;
      case "ADD_FEEDBACK":
        try {
          const feedback = action.payload;
          const feedbackVal = await service.createFeedback(feedback);
          feedbackVal.assessmentId &&
            baseDispatch({
              type: "ADD_FEEDBACK",
              payload: feedbackVal,
            });
        } catch (err) {
          console.log(err);
        }
        break;
      case "DELETE_RECORD":
        try {
          const {id} = action.payload;
          // await service.removeAnnotation(id);
          baseDispatch({type: "DELETE_RECORD", payload: action.payload});
        } catch (err) {
          console.log(err);
        }
        break;
      default:
        baseDispatch(action);
    }
  };

  useEffect(() => {
    const handleCreate = (data: {sources: HighlightSource[]; type: string}) => {
      //give indicator to user if there is still another draft
      // console.log("Code is being executed");
      // console.log("state.drafting:", state);

      // if (state.drafting || state.editing) {
      //   alert("You have another draft or editing");
      //   return;
      // }
      const id = data.sources[0].id;
      const _node = state.highlighterLib?.getDoms(id)[0];
      console.log(data);
      if (_node) {
        _node.innerHTML =
          `<span id=${`__highlight-${id}`}></span>` + _node.innerHTML;
      }
      if (data.type != "from-store") {
        dispatch({type: "SET_DRAFTING", payload: data.sources[0]});
      }
    };
    const handleClick = (data: {id: string}) => {
      // const currentSelected = state.records.find(
      //   (record) => record.id === data.id
      // ) as Annotation;

      const selectedArea = state.highlighterLib?.getDoms(data.id)[0];
      selectedArea ? setSelectedHighlightElement(selectedArea) : null;
      setSelectedHighlightId(data.id);
      dispatch({type: "SELECT_HIGHLIGHT", payload: data.id});
    };

    const handleHover = (data: {id: string}) => {
      const id = data.id;
      state.highlighterLib?.addClass("highlight-hover", id);
    };
    const handleHoverOut = (data: {id: string}) => {
      const id = data.id;
      state.highlighterLib?.removeClass("highlight-hover", id);
    };
    state.highlighterLib?.on(Highlighter.event.CREATE, handleCreate);
    state.highlighterLib?.on(Highlighter.event.CLICK, handleClick);
    state.highlighterLib?.on(Highlighter.event.HOVER_OUT, handleHoverOut);
    state.highlighterLib?.on(Highlighter.event.HOVER, handleHover);

    // Cleanup function to remove the listeners
    return () => {
      state.highlighterLib?.off(Highlighter.event.CREATE, handleCreate);
      state.highlighterLib?.off(Highlighter.event.CLICK, handleClick);
      state.highlighterLib?.off(Highlighter.event.HOVER_OUT, handleHoverOut);
    };
  }, [state.highlighterLib]);

  useEffect(() => {
    const handleCreate = (data: {sources: HighlightSource[]; type: string}) => {
      //give indicator to user if there is still another draft
      // console.log("Code is being executed");
      // console.log("state.drafting:", state);

      // if (state.drafting || state.editing) {
      //   alert("You have another draft or editing");
      //   state.highlighterLib?.remove(data.sources[0].id);
      //   return;
      // }
      const id = data.sources[0].id;
      const _node = state.highlighterLib?.getDoms(id)[0];
      console.log(data);
      if (_node) {
        _node.innerHTML =
          `<span id=${`__highlight-${id}`}></span>` + _node.innerHTML;
      }
      if (data.type != "from-store") {
        dispatch({type: "SET_DRAFTING", payload: data.sources[0]});
      }
    };
    state.highlighterLib?.on(Highlighter.event.CREATE, handleCreate);
  }, [state.drafting, state.editing]);

  return (
    <HighlighterContext.Provider value={{state, dispatch}}>
      {children}
      {state.drafting ? (
        <RenderPop highlighting={state.drafting}></RenderPop>
      ) : null}
      {selectedHighlightElement && selectedHighlighId && (
        <Tippy
          interactive={true}
          render={(attrs) => (
            <button
              onClick={() => {
                state.highlighterLib?.remove(selectedHighlighId);
                setSelectedHighlightElement(null);
                setSelectedHighlightId(null);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0"
                />
              </svg>
            </button>
          )}
          visible={true}
          reference={selectedHighlightElement}
        ></Tippy>
      )}
    </HighlighterContext.Provider>
  );
};

export const useHighlighterState = () => {
  const context = useContext(HighlighterContext);
  if (!context) {
    throw new Error(
      "useHighlighterState must be used within a HighlighterProvider"
    );
  }
  return context.state;
};

export const useHighlighterDispatch = () => {
  const context = useContext(HighlighterContext);
  if (!context) {
    throw new Error(
      "useHighlighterDispatch must be used within a HighlighterProvider"
    );
  }
  return context.dispatch;
};
