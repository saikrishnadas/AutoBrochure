import { ImageGallery } from "@/components/image-gallery"

const TemplateImages = [
  {
    id: "1",
    src: "/arabiandelightstemplate.jpg",
    alt: "Arabian Delights Template",
    title: "Arabian Delights Template",
    description: "Arabian Delights Template for dates and nuts",
    tags: ["dates", "nuts"],
    googleSheetId: "1234567890",
    noOfgoogleSheetRows: 5,
    googleSheetFields: ["name","price","weight","image"]
  },
  {
    id: "2",
    src: "/freshmarkettemplate.png", 
    alt: "Fresh Market Template",
    title: "Fresh Market Template",
    description: "Fresh Market Template for vegetables and fruits",
    tags: ["vegetables", "fruits"],
    googleSheetId: "123456sadasd",
    noOfgoogleSheetRows: 16,
    googleSheetFields: ["name", "price", "image"]
  }
]

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold mb-4">Auto Brochure</h1>
        <p className="text-lg text-muted-foreground">
          Template List
        </p>
      </div>
      
      <ImageGallery images={TemplateImages} />
    </div>
  );
}
