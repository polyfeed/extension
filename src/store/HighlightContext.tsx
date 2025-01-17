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
import { RenderPop } from "../components/Toolbar";
import {
  Annotation,
  AnnotationTag,
  SideBarAction,
  AnnotationData,
  Feedback,
  getClassForTag,
  AnnotationActionPoint,
} from "../types";
import Tippy from "@tippyjs/react";
import { toast } from "react-toastify";
import { useSidebar } from "../hooks/useSidebar";
interface HighlightState {
  highlighterLib: Highlighter | null;
  feedbackInfo: Feedback | null;
  records: AnnotationData[];
  isHighlighting: boolean;
  editing: {
    sidebarAction: SideBarAction;
    annotation: Annotation;
  } | null;
  drafting: HighlightSource | null;
  unlabledHighlights: HighlightSource[];
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
  payload: { sidebarAction: SideBarAction; annotation: Annotation };
}

interface SetIsHighlightingAction {
  type: "SET_IS_HIGHLIGHTING";
  payload: boolean;
}

interface DeleteRecordAction {
  type: "DELETE_RECORD";
  payload: string;
}
interface SetDraftingAction {
  type: "SET_DRAFTING";
  payload: HighlightSource;
}

interface UpdateHighlight {
  type: "UPDATE_HIGHLIGHT_NOTES";
  payload: { id: string; notes: string };
}
interface DeleteAllHighlights {
  type: "DELETE_ALL_HIGHLIGHTS";
}
interface DeleteFeedback {
  type: "DELETE_FEEDBACK";
}
interface AddActionItem {
  type: "ADD_ACTION_ITEM";
  payload: { id: string; actionItem: AnnotationActionPoint };
}
interface CancelHighlighted {
  type: "CANCEL_HIGHLIGHTED";
}
interface UpdateActionItems {
  type: "UPDATE_HIGHLIGHT_ACTION_ITEMS";
  payload: { id: string; actionItems: AnnotationActionPoint[] };
}
type Action =
  | AddRecordAction
  | SetEditingAction
  | SetIsHighlightingAction
  | DeleteRecordAction
  | InitializeAction
  | SetDraftingAction
  | AddFeedbackAction
  | UpdateHighlight
  | DeleteAllHighlights
  | DeleteFeedback
  | AddActionItem
  | CancelHighlighted
  | UpdateActionItems;

const HighlighterContext = createContext<
  { state: HighlightState; dispatch: React.Dispatch<Action> } | undefined
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
        // wrapTag: "span",
        exceptSelectors: ["#react-root", "img", "br", "footer"],
      });

      lib.on("selection:create", ({ sources }: any) => {
        sources = sources.map((hs: any) => ({ hs }));

        console.log("sources", sources);
      });

      lib.run();
      const initialState: HighlightState = {
        highlighterLib: lib,
        records: action.payload?.highlights ? action.payload.highlights : [],
        editing: null,
        isHighlighting: false,
        feedbackInfo: action.payload,
        drafting: null,
        unlabledHighlights: [],
      };
      if (action.payload) {
        useSidebar().setCollapsed(false);
      }
      console.log("initialize");

      return { ...state, ...initialState };
    case "SET_DRAFTING":
      return {
        ...state,
        drafting: action.payload,
        unlabledHighlights: [...state.unlabledHighlights, action.payload],
      };
    case "ADD_RECORD":
      //after adding record to db, add to state and remove from current editing and drafting
      return {
        ...state,
        editing: null,
        drafting: null,
        records: [...state.records, action.payload],
      };
    case "SET_EDITING":
      return { ...state, editing: action.payload };
    case "SET_IS_HIGHLIGHTING":
      action.payload
        ? state.highlighterLib?.run()
        : state.highlighterLib?.stop();
      return { ...state, isHighlighting: action.payload };
    case "DELETE_RECORD":
      const newRecords = state.records.filter(
        (record) => record.annotation.id !== action.payload
      );
      state.highlighterLib?.remove(action.payload);
      return { ...state, records: newRecords };
    case "ADD_FEEDBACK":
      return { ...state, feedbackInfo: action.payload };
    case "DELETE_ALL_HIGHLIGHTS":
      return { ...state, records: [] };
    case "DELETE_FEEDBACK":
      return { ...state, feedbackInfo: null, records: [] };
    case "ADD_ACTION_ITEM":
      const record = state.records.find(
        (record) => record.annotation.id === action.payload.id
      );
      if (record) {
        record.actionItems ??= [];
        record.actionItems.push(action.payload.actionItem);
      }

      return { ...state };
    case "UPDATE_HIGHLIGHT_NOTES":
      const recordToUpdate = state.records.find(
        (record) => record.annotation.id === action.payload.id
      );
      if (recordToUpdate) {
        recordToUpdate.annotation.notes = action.payload.notes;
      }
      return { ...state, editing: null, drafting: null };
    case "CANCEL_HIGHLIGHTED":
      state.highlighterLib?.remove(state.drafting?.id || "");
      return { ...state, editing: null, drafting: null };
    case "UPDATE_HIGHLIGHT_ACTION_ITEMS":
      const recordToUpdateAction = state.records.find(
        (record) => record.annotation.id === action.payload.id
      );
      if (recordToUpdateAction) {
        recordToUpdateAction.actionItems = action.payload.actionItems;
      }
      return { ...state, editing: null, drafting: null };
    default:
      return state;
  }
};

export const HighlighterProvider = ({ children }: { children: ReactNode }) => {
  const initialState: HighlightState = {
    highlighterLib: null,
    records: [],
    editing: null,
    isHighlighting: false,
    drafting: null,
    unlabledHighlights: [],
    feedbackInfo: null,
  };
  const { setCollapsed } = useSidebar();
  const [state, baseDispatch] = useReducer(highlighterReducer, initialState);
  const [selectedHighlightElement, setSelectedHighlightElement] =
    useState<Element | null>(null);
  const [selectedHighlighId, setSelectedHighlightId] = useState<string | null>(
    null
  );
  const service = new AnnotationService();

  const dispatch = async (action: Action) => {
    switch (action.type) {
      case "ADD_RECORD":
        try {
          const sources = action.payload;
          if (state.feedbackInfo) {
            const creationStatus = service.addAnnotations(sources);
            toast.promise(creationStatus, {
              pending: "Saving...",
              success: "Saved",
              error: "Error saving please try again",
            });
            const res = await creationStatus;
            if (res.status !== 200) {
              return;
            }
            baseDispatch({ type: "ADD_RECORD", payload: action.payload });
          } else {
            toast.error("Please select valid assignment");
          }
        } catch (err) {
          console.log(err);
        }
        break;
      case "DELETE_RECORD":
        try {
          const status = service.deleteAnnotation(action.payload);
          toast.promise(status, {
            pending: "Deleting...",
            success: "Deleted Highlight",
            error: "Error deleting please try again",
          });
          const res = await status;
          if (res.status !== 200) {
            return;
          }
          baseDispatch({ type: "DELETE_RECORD", payload: action.payload });
        } catch (err) {
          console.log(err);
        }
        break;
      case "UPDATE_HIGHLIGHT_NOTES":
        try {
          const status = service.updateHighlightNotes(
            action.payload.id,
            action.payload.notes
          );
          toast.promise(status, {
            pending: "Updating...",
            success: "Updated Highlight",
            error: "Error updating please try again",
          });
          const res = await status;
          if (res.status !== 200) {
            return;
          }
          baseDispatch({
            type: "UPDATE_HIGHLIGHT_NOTES",
            payload: action.payload,
          });
        } catch (err) {
          console.log(err);
        }

        break;
      case "DELETE_ALL_HIGHLIGHTS":
        try {
          const status = state.feedbackInfo?.id
            ? service.deleteAllHighlights(state.feedbackInfo.id)
            : undefined;
          if (status) {
            toast.promise(status, {
              pending: "Deleting all highlights...",
              success: "Deleted Highlight",
              error: "Error deleting please try again",
            });
            const res = await status;
            if (res.status == 200) {
              state.highlighterLib?.removeAll();
              baseDispatch({ type: "DELETE_ALL_HIGHLIGHTS" });
            }
          }
        } catch (err) {
          console.log(err);
        }
        break;
      case "DELETE_FEEDBACK":
        try {
          const status = state.feedbackInfo?.id
            ? service.deleteFeedback(state.feedbackInfo.id)
            : undefined;
          if (status) {
            toast.promise(status, {
              pending: "Deleting feedback...",
              success: "Deleted feedback",
              error: "Error deleting please try again",
            });
            const res = await status;
            if (res.status == 200) {
              state.highlighterLib?.removeAll();
              baseDispatch({ type: "DELETE_FEEDBACK" });
            }
          }
        } catch (err) {
          console.log(err);
        }
        break;
      case "ADD_ACTION_ITEM":
        try {
          const status = service.addActionItem(
            action.payload.id,
            action.payload.actionItem
          );
          toast.promise(status, {
            pending: "Adding action item...",
            success: "Added action item",
            error: "Error adding action item please try again",
          });
          const res = await status;
          if (res.status == 200) {
            baseDispatch({ type: "ADD_ACTION_ITEM", payload: action.payload });
          }
        } catch (err) {
          console.log(err);
        }
        break;
      case "UPDATE_HIGHLIGHT_ACTION_ITEMS":
        try {
          const status = service.updateHighlightActionItem(
            action.payload.id,
            action.payload.actionItems
          );
          toast.promise(status, {
            pending: "Updating action items...",
            success: "Updated action items",
            error: "Error updating action items please try again",
          });
          const res = await status;
          if (res.status == 200) {
            baseDispatch({
              type: "UPDATE_HIGHLIGHT_ACTION_ITEMS",
              payload: action.payload,
            });
          }
        } catch (err) {
          console.log(err);
        }
        break;
      default:
        baseDispatch(action);
    }
  };

  useEffect(() => {
    const handleCreate = (data: {
      sources: HighlightSource[];
      type: string;
    }) => {
      const id = data.sources[0].id;
      const _node = state.highlighterLib?.getDoms(id)[0];
      if (_node) {
        _node.id = `__highlight-${id}`;
      }
      if (data.type != "from-store") {
        console.log("data.sources[0]", data.sources[0]);
        dispatch({ type: "SET_DRAFTING", payload: data.sources[0] });
      }
    };

    const handleClick = (data: { id: string }) => {
      // const currentSelected = state.records.find(
      //   (record) => record.id === data.id
      // ) as Annotation;

      const selectedArea = state.highlighterLib?.getDoms(data.id)[0];

      console.log("selectedArea", state.highlighterLib?.getDoms(data.id));

      selectedArea ? setSelectedHighlightElement(selectedArea) : null;
      console.log("selected elem", selectedHighlightElement);
      setSelectedHighlightId(data.id);
      // dispatch({type: "SELECT_HIGHLIGHT", payload: data.id});

      setCollapsed(false);
      const hostElement = document.getElementById("sidebar-root");
      const sidebarShadowRoot = hostElement?.shadowRoot;
      //remove selected focus
      sidebarShadowRoot?.querySelectorAll(".selected").forEach((elem) => {
        elem.classList.remove("selected");
      });
      const cardView = sidebarShadowRoot?.getElementById(
        `card-view-${data.id}`
      );
      cardView?.classList.add("selected");
      // const cardView = document.getElementById(`card-view-${data.id}`);
      console.log("card view", cardView);

      cardView?.scrollIntoView({ behavior: "smooth", block: "center" });
    };

    const handleHover = (data: { id: string }) => {
      const id = data.id;
      state.highlighterLib?.addClass("highlight-hover", id);
    };
    const handleHoverOut = (data: { id: string }) => {
      const id = data.id;
      state.highlighterLib?.removeClass("highlight-hover", id);
    };
    state.highlighterLib?.on(Highlighter.event.CREATE, handleCreate);
    state.highlighterLib?.on(Highlighter.event.CLICK, handleClick);
    state.highlighterLib?.on(Highlighter.event.HOVER_OUT, handleHoverOut);
    state.highlighterLib?.on(Highlighter.event.HOVER, handleHover);

    state.records.map((highlight) => {
      console.log("highlight", highlight);

      state.highlighterLib?.fromStore(
        highlight.annotation.startMeta,
        highlight.annotation.endMeta,
        highlight.annotation.text,
        highlight.annotation.id
      );

      console.log(
        "highlight.annotation.startMeta.parentIndex",
        highlight.annotation.startMeta.parentIndex
      );
      if (highlight.annotation.startMeta.parentIndex > 10) {
        console.log("checking", {
          ...highlight.annotation.endMeta,
          parentIndex: highlight.annotation.endMeta.parentIndex - 4,
          parentTagName:
            highlight.annotation.endMeta.parentTagName === "BR"
              ? highlight.annotation.startMeta.parentTagName
              : highlight.annotation.endMeta.parentTagName,
        });
        state.highlighterLib?.fromStore(
          {
            ...highlight.annotation.startMeta,
            parentIndex: highlight.annotation.startMeta.parentIndex - 4,
          },
          {
            ...highlight.annotation.endMeta,
            parentIndex: highlight.annotation.endMeta.parentIndex - 4,
          },
          highlight.annotation.text,
          highlight.annotation.id
        );
      }

      state.highlighterLib?.addClass(
        getClassForTag(highlight.annotation.annotationTag),
        highlight.annotation.id
      );
    });

    // Cleanup function to remove the listeners
    return () => {
      state.highlighterLib?.off(Highlighter.event.CREATE, handleCreate);
      state.highlighterLib?.off(Highlighter.event.CLICK, handleClick);
      state.highlighterLib?.off(Highlighter.event.HOVER_OUT, handleHoverOut);
    };
  }, [state.highlighterLib]);

  // monitor the expand icon onclick
  useEffect(() => {
    const handleIconClick = (event: any) => {
      state.records.map((highlight) => {
        if (highlight.annotation.startMeta.parentIndex < 11)
          state.highlighterLib?.fromStore(
            {
              ...highlight.annotation.startMeta,
              parentIndex: highlight.annotation.startMeta.parentIndex + 4,
            },
            {
              ...highlight.annotation.endMeta,
              parentIndex: highlight.annotation.endMeta.parentIndex + 4,
            },
            highlight.annotation.text,
            highlight.annotation.id
          );

        state.highlighterLib?.addClass(
          getClassForTag(highlight.annotation.annotationTag),
          highlight.annotation.id
        );
      });
    };

    // Polling function to wait for elements to be available
    const waitForIcons = setInterval(() => {
      const icons = document.querySelectorAll('i[title][title="View full"]');

      if (icons.length > 0) {
        clearInterval(waitForIcons); // Stop polling once elements are found
        icons[1].addEventListener("click", handleIconClick);
      }
    }, 500); // Check every 500ms

    // Cleanup
    return () => {
      clearInterval(waitForIcons); // Ensure to clear the interval on component unmount
      // Remove event listeners if necessary
      const icons = document.querySelectorAll('i[title][title="View full"]');

      if (icons.length > 0) {
        clearInterval(waitForIcons); // Stop polling once elements are found
        icons[1].addEventListener("click", handleIconClick);
      }
    };
  }, [state.records, state.highlighterLib]);

  return (
    <HighlighterContext.Provider value={{ state, dispatch }}>
      {children}
      {state.drafting && <RenderPop highlighting={state.drafting}></RenderPop>}
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
