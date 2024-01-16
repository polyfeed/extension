import {Notes} from "../Notes";
import TodoCard from "../TodoCard";
import {
  useHighlighterDispatch,
  useHighlighterState,
} from "../../../store/HighlightContext";

import {
  AnnotationNotes,
  AnnotationData,
  AnnotationActionPoint,
  AnnotationTag,
  Annotation,
} from "../../../types";
import {SideBarAction} from "../../../types";
import {getColorForTag, getClassForTag} from "../../../types";
import {useState, useEffect} from "react";
import {toast} from "react-toastify";
import {input} from "@material-tailwind/react";
import AnnotationService from "../../../services/annotation.service";
import {ExplainFutherToggle} from "../ExplainFutherInput";

function RenderTabs({
  currentEditing,
}: {
  currentEditing: {sidebarAction: SideBarAction; annotation: Annotation} | null;
}) {
  const [explanation, setExplanation] = useState("");
  const highlighterDispatch = useHighlighterDispatch();
  const highlighterState = useHighlighterState();
  // const currentEditing = highlighterState.editing;
  const editing = highlighterState.records.find(
    (annotation) => annotation.annotation.id === currentEditing?.annotation.id
  );
  console.log("editing", currentEditing);
  const addNotes = (input: String) => {
    highlighterDispatch({
      type: "ADD_RECORD",
      payload: {
        annotation: {
          ...currentEditing?.annotation,
          notes: input,
        } as Annotation,
      } as AnnotationData,
    });
  };

  const addToDo = (actionItems: AnnotationActionPoint[]) => {
    const currentActions = highlighterState.records.find(
      (record) => record.annotation.id === currentEditing?.annotation.id
    )?.actionItems;

    highlighterDispatch({
      type: "ADD_RECORD",
      payload: {
        annotation: currentEditing?.annotation,
        actionItems: actionItems,
      } as AnnotationData,
    });
  };

  const updateToDO = (actionItems: AnnotationActionPoint[]) => {
    highlighterDispatch({
      type: "UPDATE_HIGHLIGHT_ACTION_ITEMS",
      payload: {
        id: currentEditing?.annotation.id ?? "",
        actionItems: actionItems,
      },
    });
  };
  const cancelHighlighting = () => {
    highlighterDispatch({type: "CANCEL_HIGHLIGHTED"});
  };

  switch (currentEditing?.sidebarAction) {
    case "Notes":
      return (
        <div>
          <div>
            <Notes
              setNote={addNotes}
              notes={currentEditing.annotation.notes || ""}
              cancelFunc={cancelHighlighting}
            ></Notes>
          </div>
        </div>
      );
    case "To-Dos":
      return <div>{<TodoCard saveFunc={addToDo}></TodoCard>}</div>;
    case "Editing":
      return (
        <div>
          <p>
            {editing?.actionItems?.length ?? 0 > 0 ? (
              <TodoCard
                key={editing?.annotation.id}
                saveFunc={updateToDO}
                todoitems={editing?.actionItems}
              ></TodoCard>
            ) : (
              <Notes
                key={editing?.annotation.id}
                setNote={(input) =>
                  highlighterDispatch({
                    type: "UPDATE_HIGHLIGHT_NOTES",
                    payload: {id: currentEditing.annotation.id, notes: input},
                  })
                }
                notes={currentEditing.annotation.notes || ""}
                cancelFunc={cancelHighlighting}
              ></Notes>
            )}
          </p>
        </div>
      );
    default:
      return null;
  }
}

export function HighlightingTab() {
  const highlighterState = useHighlighterState();
  const currentEditing = highlighterState.editing;

  const annotationTagColor = getColorForTag(
    currentEditing?.annotation.annotationTag
  );
  useEffect(() => {
    highlighterState.highlighterLib?.addClass(
      getClassForTag(currentEditing?.annotation.annotationTag),
      currentEditing?.annotation.id
    );
  }, [currentEditing]);

  return (
    <div className="space-y-4">
      <div className="flex items-start">
        {currentEditing &&
        currentEditing.sidebarAction !== "Explain Further" ? (
          <blockquote
            className={`flex-grow border-l-4 pl-4 text-left`}
            style={{borderColor: `${annotationTagColor}`}}
          >
            <p className="text text-gray-700 italic">
              <span className="block text-xl text-gray-500 mb-1">
                {currentEditing.annotation.annotationTag}
              </span>
              {currentEditing.annotation.text}
            </p>
          </blockquote>
        ) : null}
      </div>
      <div className="w-full">
        <RenderTabs currentEditing={currentEditing}></RenderTabs>
      </div>
    </div>
  );
}
